import type { Chunk, Verse } from "../types.ts";

const MAX_VERSES = 6;
const OVERLAP = 2;

function joinRange(verses: Verse[]): string {
  return verses
    .map((v) => `${v.book} ${v.chapter}:${v.verse} ${v.text}`)
    .join(" ");
}

function toChunk(workId: string, slice: Verse[]): Chunk {
  const first = slice[0]!;
  const last = slice.at(-1)!;
  return {
    workId,
    kind: "translation",
    text: joinRange(slice),
    passage: {
      start: { book: first.book, chapter: first.chapter, verse: first.verse },
      end: { book: last.book, chapter: last.chapter, verse: last.verse },
    },
    references: [],
  };
}

function splitLong(workId: string, verses: Verse[]): Chunk[] {
  if (verses.length <= MAX_VERSES) return [toChunk(workId, verses)];
  const chunks: Chunk[] = [];
  for (let i = 0; i < verses.length; ) {
    const end = Math.min(i + MAX_VERSES, verses.length);
    chunks.push(toChunk(workId, verses.slice(i, end)));
    if (end >= verses.length) break;
    i = Math.max(i + 1, end - OVERLAP);
  }
  return chunks;
}

/** Chunk on USFM paragraph boundaries; split long units with 1–2 verse overlap. */
export function chunkBible(workId: string, paragraphs: Verse[][]): Chunk[] {
  return paragraphs.flatMap((para) =>
    para.length ? splitLong(workId, para) : [],
  );
}
