#!/usr/bin/env npx tsx
/** Download HelloAO commentary JSON (public-domain mark or CC BY-SA). */

import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://bible.helloao.org";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "corpus", "commentary");
const WORK_IDS: Record<string, string> = {
  "adam-clarke": "clarke",
  "jamieson-fausset-brown": "jfb",
  "john-calvin": "calvin",
  "john-gill": "gill",
  "keil-delitzsch": "keil-delitzsch",
  "matthew-henry": "matthew-henry",
  tyndale: "tyndale",
};
const WORKERS = 8;
const RETRIES = 4;

type CommentaryMeta = { id: string };
type Catalog = { commentaries: CommentaryMeta[] };
type Book = {
  id: string;
  firstChapterNumber?: number | null;
  lastChapterNumber?: number | null;
};
type BooksResponse = { books: Book[] };

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson<T>(apiPath: string): Promise<T> {
  const url = apiPath.startsWith("/") ? BASE + apiPath : apiPath;
  let last: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      return (await resp.json()) as T;
    } catch (err) {
      last = err;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw new Error(`failed ${url}: ${last}`);
}

async function fetchChapter(
  srcId: string,
  bookId: string,
  chapter: number,
  dest: string,
): Promise<"ok" | "skip" | "missing"> {
  await mkdir(path.dirname(dest), { recursive: true });
  try {
    if ((await stat(dest)).size > 2) return "skip";
  } catch {
    /* missing */
  }
  const url = `${BASE}/api/c/${srcId}/${bookId}/${chapter}.json`;
  let last: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (resp.status === 404) return "missing";
      if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
      await writeFile(dest, Buffer.from(await resp.arrayBuffer()));
      return "ok";
    } catch (err) {
      last = err;
      await sleep(1200 * (attempt + 1));
    }
  }
  throw new Error(`failed ${url}: ${last}`);
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
  onEach: (result: PromiseSettledResult<R>, done: number) => void,
): Promise<void> {
  let next = 0;
  let done = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      let result: PromiseSettledResult<R>;
      try {
        result = { status: "fulfilled", value: await fn(items[i]) };
      } catch (reason) {
        result = { status: "rejected", reason };
      }
      done++;
      onEach(result, done);
    }
  });
  await Promise.all(workers);
}

async function main(): Promise<void> {
  const catalog = await getJson<Catalog>("/api/available_commentaries.json");
  await mkdir(ROOT, { recursive: true });
  await writeFile(
    path.join(ROOT, "helloao-available_commentaries.json"),
    JSON.stringify(catalog, null, 2),
  );

  const jobs: { srcId: string; workId: string; bookId: string; chapter: number; dest: string }[] =
    [];
  for (const item of catalog.commentaries) {
    const workId = WORK_IDS[item.id];
    if (!workId) {
      console.log(`skip unknown ${item.id}`);
      continue;
    }
    const workDir = path.join(ROOT, workId);
    await mkdir(workDir, { recursive: true });
    await writeFile(path.join(workDir, "SOURCE.json"), JSON.stringify(item, null, 2));
    const books = await getJson<BooksResponse>(`/api/c/${item.id}/books.json`);
    await writeFile(path.join(workDir, "books.json"), JSON.stringify(books, null, 2));
    for (const book of books.books) {
      if (book.firstChapterNumber == null || book.lastChapterNumber == null) {
        console.log(`  skip ${workId}/${book.id} (no chapter range)`);
        continue;
      }
      for (let chapter = book.firstChapterNumber; chapter <= book.lastChapterNumber; chapter++) {
        jobs.push({
          srcId: item.id,
          workId,
          bookId: book.id,
          chapter,
          dest: path.join(workDir, book.id, `${chapter}.json`),
        });
      }
    }
  }

  console.log(`${jobs.length} chapter files`);
  let ok = 0;
  let skip = 0;
  let missing = 0;
  let fail = 0;
  await mapPool(
    jobs,
    WORKERS,
    (job) => fetchChapter(job.srcId, job.bookId, job.chapter, job.dest),
    (result, done) => {
      if (result.status === "rejected") {
        fail++;
        console.log(`FAIL: ${result.reason}`);
      } else if (result.value === "ok") ok++;
      else if (result.value === "skip") skip++;
      else missing++;
      if (done % 200 === 0) {
        console.log(`  ${done}/${jobs.length} ok=${ok} skip=${skip} missing=${missing} fail=${fail}`);
      }
    },
  );
  console.log(`done ok=${ok} skip=${skip} missing=${missing} fail=${fail}`);
}

await main();
