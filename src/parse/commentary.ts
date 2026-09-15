import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Chunk, Passage, WorkManifest } from "../types.ts";

const MAX_CHARS = 2500;
const OVERLAP = 200;

type HelloAoItem = { type?: string; number?: number; content?: unknown };
type HelloAoChapter = {
  book?: { id?: string; name?: string };
  chapter?: { number?: number; content?: HelloAoItem[] };
};

function joinContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(joinContent).join("\n");
  return "";
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function splitLong(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const parts: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + MAX_CHARS, text.length);
    if (end < text.length) {
      const cut = text.lastIndexOf(" ", end);
      if (cut > i + MAX_CHARS / 2) end = cut;
    }
    const piece = text.slice(i, end).trim();
    if (piece) parts.push(piece);
    if (end >= text.length) break;
    i = end - OVERLAP;
  }
  return parts;
}

function lemmaChunks(
  work: WorkManifest,
  bookId: string,
  bookName: string,
  chapter: number,
  lemmas: { verse: number; text: string }[],
  maxVerse?: number,
): Chunk[] {
  const bookMeta = {
    workId: work.workId,
    title: work.title,
    author: work.author,
    year: work.year,
    publisher: work.publisher,
    language: work.language,
    license: work.license,
    attribution: work.attribution,
    tradition: work.tradition,
    volume: bookName,
  };
  const out: Chunk[] = [];
  for (let i = 0; i < lemmas.length; i++) {
    const start = lemmas[i]!.verse;
    const next = lemmas[i + 1]?.verse;
    let end = next != null ? next - 1 : (maxVerse ?? start);
    if (end < start) end = start;
    const passage: Passage = {
      start: { book: bookId, chapter, verse: start },
      end: { book: bookId, chapter, verse: end },
    };
    for (const text of splitLong(lemmas[i]!.text)) {
      out.push({
        workId: work.workId,
        kind: "commentary",
        text,
        passage,
        references: [],
        bookMeta,
      });
    }
  }
  return out;
}

export async function parseHelloAo(
  dir: string,
  work: WorkManifest,
  maxVerse: (book: string, chapter: number) => number | undefined,
): Promise<Chunk[]> {
  const books = (await readdir(dir, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  const chunks: Chunk[] = [];
  for (const book of books) {
    const files = (await readdir(path.join(dir, book)))
      .filter((n) => n.endsWith(".json"))
      .sort((a, b) => Number.parseInt(a) - Number.parseInt(b));
    for (const file of files) {
      const raw = JSON.parse(
        await readFile(path.join(dir, book, file), "utf8"),
      ) as HelloAoChapter;
      const chapter = raw.chapter?.number ?? Number.parseInt(file);
      const bookId = raw.book?.id ?? book;
      const bookName = raw.book?.name ?? bookId;
      const lemmas = (raw.chapter?.content ?? [])
        .filter((c) => c.type === "verse" && c.number != null)
        .map((c) => ({
          verse: Number(c.number),
          text: stripTags(joinContent(c.content)),
        }))
        .filter((c) => c.text);
      chunks.push(
        ...lemmaChunks(
          work,
          bookId,
          bookName,
          chapter,
          lemmas,
          maxVerse(bookId, chapter),
        ),
      );
    }
  }
  return chunks;
}

type DouayManifest = {
  books: { slug: string; usfm: string }[];
};
type DouayChapter = {
  chapter: number;
  annotations: { verse: number; title?: string; text: string }[];
};

export async function parseDouay(
  dir: string,
  work: WorkManifest,
  maxVerse: (book: string, chapter: number) => number | undefined,
): Promise<Chunk[]> {
  const manifest = JSON.parse(
    await readFile(path.join(dir, "manifest.json"), "utf8"),
  ) as DouayManifest;
  const slugToOsis = new Map(manifest.books.map((b) => [b.slug, b.usfm]));
  const root = path.join(dir, "annotations");
  const slugs = await readdir(root);
  const chunks: Chunk[] = [];
  for (const slug of slugs) {
    const bookId = slugToOsis.get(slug);
    if (!bookId) continue;
    const files = (await readdir(path.join(root, slug)))
      .filter((n) => n.endsWith(".json"))
      .sort();
    for (const file of files) {
      const raw = JSON.parse(
        await readFile(path.join(root, slug, file), "utf8"),
      ) as DouayChapter;
      const lemmas = (raw.annotations ?? [])
        .filter((a) => a.verse != null && a.text)
        .map((a) => ({
          verse: Number(a.verse),
          text: stripTags([a.title, a.text].filter(Boolean).join(" — ")),
        }));
      chunks.push(
        ...lemmaChunks(
          work,
          bookId,
          slug,
          raw.chapter,
          lemmas,
          maxVerse(bookId, raw.chapter),
        ),
      );
    }
  }
  return chunks;
}
