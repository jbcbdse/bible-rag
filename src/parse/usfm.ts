import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Verse } from "../types.ts";

const SKIP_BOOKS = new Set([
  "FRT",
  "GLO",
  "INT",
  "BAK",
  "CNC",
  "TDX",
  "NDX",
  "XXA",
  "XXB",
  "XXC",
  "XXD",
  "XXE",
  "XXF",
  "XXG",
  "ILS",
  "PRE",
]);

export function cleanUsfm(raw: string): string {
  return raw
    .replace(/\\f[\s\S]*?\\f\*/g, "")
    .replace(/\\x[\s\S]*?\\x\*/g, "")
    .replace(/\\fig[\s\S]*?\\fig\*/g, "")
    .replace(/\\w\s+([^\\|]+)\|[^\\]*\\w\*/g, "$1")
    .replace(/\\\+w\s+([^\\|]+)\|[^\\]*\\\+w\*/g, "$1")
    .replace(/\\(?:wj|add|nd|qt|bd|it|em|sc|tl|k|bk)\s*/g, "")
    .replace(/\\(?:wj|add|nd|qt|bd|it|em|sc|tl|k|bk)\*/g, "")
    .replace(/\\[a-zA-Z]+\d*\*?(?:\s+|$)/g, " ")
    .replace(/¶/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type ParsedBible = { verses: Verse[]; paragraphs: Verse[][] };

export function parseUsfm(source: string, workId: string): ParsedBible {
  const verses: Verse[] = [];
  const paragraphs: Verse[][] = [];
  let para: Verse[] = [];
  let book = "";
  let chapter = 0;
  let verse = 0;

  const flushPara = () => {
    if (para.length) paragraphs.push(para);
    para = [];
  };

  const push = (text: string) => {
    const cleaned = cleanUsfm(text);
    if (!book || !chapter || !verse || !cleaned || SKIP_BOOKS.has(book)) return;
    const last = verses.at(-1);
    if (
      last &&
      last.book === book &&
      last.chapter === chapter &&
      last.verse === verse
    ) {
      last.text = `${last.text} ${cleaned}`.trim();
      return;
    }
    const row: Verse = { workId, book, chapter, verse, text: cleaned };
    verses.push(row);
    para.push(row);
  };

  for (const line of source.split(/\r?\n/)) {
    const id = line.match(/^\\id\s+(\S+)/);
    if (id) {
      flushPara();
      book = id[1]!;
      chapter = 0;
      verse = 0;
      continue;
    }
    const ch = line.match(/^\\c\s+(\d+)/);
    if (ch) {
      flushPara();
      chapter = Number(ch[1]);
      verse = 0;
      continue;
    }
    if (/^\\(?:p|s\d?|m|li\d?|nb)\b/.test(line)) flushPara();
    const vs = line.match(/\\v\s+(\d+)(?:-\d+)?\s*(.*)$/);
    if (vs) {
      verse = Number(vs[1]);
      push(vs[2] ?? "");
      continue;
    }
    if (verse && /\\[a-zA-Z]/.test(line)) {
      const rest = line.replace(/^\\[a-zA-Z]+\d*\*?\s*/, "");
      if (rest.trim()) push(rest);
    }
  }
  flushPara();
  return { verses, paragraphs };
}

export async function parseTranslationDir(
  dir: string,
  workId: string,
): Promise<ParsedBible> {
  const names = await readdir(dir);
  const files = names.filter((n) => /\.(usfm|sfm)$/i.test(n)).sort();
  const verses: Verse[] = [];
  const paragraphs: Verse[][] = [];
  for (const name of files) {
    const text = await readFile(path.join(dir, name), "utf8");
    const parsed = parseUsfm(text, workId);
    verses.push(...parsed.verses);
    paragraphs.push(...parsed.paragraphs);
  }
  return { verses, paragraphs };
}
