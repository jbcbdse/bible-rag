#!/usr/bin/env npx tsx
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chunkBible } from "./chunk/bible.ts";
import { embedTexts } from "./embed.ts";
import { parseHelloAo, parseDouay } from "./parse/commentary.ts";
import { parseTranslationDir } from "./parse/usfm.ts";
import {
  applySchema,
  counts,
  createPool,
  hashText,
  loadCachedEmbeddings,
  missingChunkHashes,
  replaceWork,
  saveEmbeddings,
} from "./store.ts";
import type { Chunk, Verse, WorkManifest } from "./types.ts";
import { WORKS } from "./works.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EMBED_BATCH = 32;

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function has(flag: string): boolean {
  return process.argv.includes(flag);
}

function elapsed(start: number): string {
  const s = (Date.now() - start) / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`;
}

async function loadWork(
  work: WorkManifest,
  maxVerse: (book: string, chapter: number) => number | undefined,
): Promise<{ verses: Verse[]; chunks: Chunk[] }> {
  const dir = path.join(ROOT, work.path);
  if (work.kind === "translation") {
    const parsed = await parseTranslationDir(dir, work.workId);
    return {
      verses: parsed.verses,
      chunks: chunkBible(work.workId, parsed.paragraphs),
    };
  }
  if (work.workId === "douay-rheims-notes") {
    return { verses: [], chunks: await parseDouay(dir, work, maxVerse) };
  }
  return { verses: [], chunks: await parseHelloAo(dir, work, maxVerse) };
}

async function embedMissing(
  pool: ReturnType<typeof createPool>,
  workId?: string,
): Promise<number> {
  const rows = await missingChunkHashes(pool, workId);
  if (!rows.length) return 0;
  let done = 0;
  const t0 = Date.now();
  for (let i = 0; i < rows.length; i += EMBED_BATCH) {
    const batch = rows.slice(i, i + EMBED_BATCH);
    const vectors = await embedTexts(batch.map((r) => r.text));
    await saveEmbeddings(
      pool,
      batch.map((r, n) => ({ hash: r.content_hash, embedding: vectors[n]! })),
    );
    done += batch.length;
    if (done % 256 === 0 || done === rows.length) {
      const rate = done / ((Date.now() - t0) / 1000);
      const left = (rows.length - done) / Math.max(rate, 0.01);
      console.log(
        `  embed ${done}/${rows.length} (${rate.toFixed(1)}/s, ~${Math.round(left)}s left)`,
      );
    }
  }
  return done;
}

async function main(): Promise<void> {
  const only = arg("--work");
  const kind = arg("--kind") as WorkManifest["kind"] | undefined;
  const noEmbed = has("--no-embed");
  const works = WORKS.filter((w) => {
    if (only && w.workId !== only) return false;
    if (kind && w.kind !== kind) return false;
    return true;
  });
  if (!works.length) throw new Error("no matching works");

  const pool = createPool();
  const t0 = Date.now();
  await applySchema(pool);

  const maxByChapter = new Map<string, number>();
  const remember = (verses: Verse[]) => {
    for (const v of verses) {
      const key = `${v.book}:${v.chapter}`;
      maxByChapter.set(key, Math.max(maxByChapter.get(key) ?? 0, v.verse));
    }
  };
  const maxVerse = (book: string, chapter: number) =>
    maxByChapter.get(`${book}:${chapter}`);

  for (const work of works) {
    const w0 = Date.now();
    const { verses, chunks } = await loadWork(work, maxVerse);
    remember(verses);
    const hashes = [...new Set(chunks.map((c) => hashText(c.text)))];
    const cached = await loadCachedEmbeddings(pool, hashes);
    await replaceWork(pool, work, verses, chunks, cached);
    console.log(
      `${work.workId}: ${verses.length} verses, ${chunks.length} chunks, ${cached.size} cached embeds (${elapsed(w0)})`,
    );
  }

  let embedded = 0;
  if (!noEmbed) {
    console.log("embedding missing chunks…");
    embedded = await embedMissing(pool, only);
  }

  const stats = await counts(pool);
  console.log(
    `done ${elapsed(t0)} — works ${stats.works}, verses ${stats.verses}, chunks ${stats.chunks}, embedded ${stats.embedded} (+${embedded} this run)`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
