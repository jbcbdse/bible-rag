import type pg from "pg";
import { embedTexts, MODEL_ID } from "./embed.ts";
import { parsePassage } from "./ref.ts";
import type { Passage, WorkKind } from "./types.ts";

const TOP_K = 8;
const CANDIDATES = 20;
const RRF_K = 60;
const QUERY_PREFIX = `Instruct: Given a Bible or commentary search query, retrieve the most relevant passage.
Query: `;

export type WorkRow = {
  workId: string;
  kind: WorkKind;
  title: string;
  author: string | null;
  publisher: string | null;
  language: string;
  license: string;
  attribution: string;
  versification: string | null;
  tradition: string | null;
  year: number | null;
};

export type VerseHit = {
  workId: string;
  license: string;
  attribution: string;
  title: string;
  passage: Passage;
  verses: { chapter: number; verse: number; text: string }[];
};

export type ChunkHit = {
  workId: string;
  kind: WorkKind;
  license: string;
  attribution: string;
  title: string;
  text: string;
  passage?: Passage;
  references: Passage[];
  book?: Record<string, unknown>;
  score?: number;
};

type ChunkRow = {
  id?: number;
  work_id: string;
  kind: WorkKind;
  text: string;
  start_book: string | null;
  start_chapter: number | null;
  start_verse: number | null;
  end_book: string | null;
  end_chapter: number | null;
  end_verse: number | null;
  references: Passage[];
  book_meta: Record<string, unknown> | null;
  license: string;
  attribution: string;
  title: string;
};

function passageOf(row: ChunkRow): Passage | undefined {
  if (
    row.start_book == null ||
    row.start_chapter == null ||
    row.start_verse == null ||
    row.end_book == null ||
    row.end_chapter == null ||
    row.end_verse == null
  ) {
    return undefined;
  }
  return {
    start: {
      book: row.start_book,
      chapter: row.start_chapter,
      verse: row.start_verse,
    },
    end: {
      book: row.end_book,
      chapter: row.end_chapter,
      verse: row.end_verse,
    },
  };
}

function toHit(row: ChunkRow, score?: number): ChunkHit {
  return {
    workId: row.work_id,
    kind: row.kind,
    license: row.license,
    attribution: row.attribution,
    title: row.title,
    text: row.text,
    passage: passageOf(row),
    references: row.references ?? [],
    book: row.book_meta ?? undefined,
    score,
  };
}

const CHUNK_COLS = `c.work_id, c.kind, c.text,
         c.start_book, c.start_chapter, c.start_verse,
         c.end_book, c.end_chapter, c.end_verse,
         c."references" AS references, c.book_meta,
         w.license, w.attribution, w.title`;

export async function listWorks(pool: pg.Pool): Promise<WorkRow[]> {
  const { rows } = await pool.query<{
    work_id: string;
    kind: WorkKind;
    title: string;
    author: string | null;
    publisher: string | null;
    language: string;
    license: string;
    attribution: string;
    versification: string | null;
    tradition: string | null;
    year: number | null;
  }>(
    `SELECT work_id, kind, title, author, publisher, language, license,
            attribution, versification, tradition, year
     FROM works ORDER BY kind, work_id`,
  );
  return rows.map((r) => ({
    workId: r.work_id,
    kind: r.kind,
    title: r.title,
    author: r.author,
    publisher: r.publisher,
    language: r.language,
    license: r.license,
    attribution: r.attribution,
    versification: r.versification,
    tradition: r.tradition,
    year: r.year,
  }));
}

export async function lookupPassage(
  pool: pg.Pool,
  reference: string,
  translation: string,
): Promise<VerseHit> {
  const passage = parsePassage(reference);
  const { rows: works } = await pool.query<{
    license: string;
    attribution: string;
    title: string;
    kind: WorkKind;
  }>(`SELECT license, attribution, title, kind FROM works WHERE work_id = $1`, [
    translation,
  ]);
  const work = works[0];
  if (!work) throw new Error(`unknown work: ${translation}`);
  if (work.kind !== "translation") {
    throw new Error(`${translation} is ${work.kind}, not a translation`);
  }
  const { rows } = await pool.query<{
    chapter: number;
    verse: number;
    text: string;
  }>(
    `SELECT chapter, verse, text FROM verses
     WHERE work_id = $1 AND book = $2
       AND (chapter > $3 OR (chapter = $3 AND verse >= $4))
       AND (chapter < $5 OR (chapter = $5 AND verse <= $6))
     ORDER BY chapter, verse`,
    [
      translation,
      passage.start.book,
      passage.start.chapter,
      passage.start.verse,
      passage.end.chapter,
      passage.end.verse,
    ],
  );
  return {
    workId: translation,
    license: work.license,
    attribution: work.attribution,
    title: work.title,
    passage,
    verses: rows,
  };
}

export async function compareTranslations(
  pool: pg.Pool,
  reference: string,
  translations: string[],
): Promise<VerseHit[]> {
  return Promise.all(
    translations.map((id) => lookupPassage(pool, reference, id)),
  );
}

export async function getCommentary(
  pool: pg.Pool,
  reference: string,
  workId?: string,
): Promise<ChunkHit[]> {
  const asked = parsePassage(reference);
  const { rows } = await pool.query<ChunkRow>(
    `SELECT ${CHUNK_COLS}
     FROM chunks c
     JOIN works w ON w.work_id = c.work_id
     WHERE c.kind = 'commentary'
       AND c.start_book = $1
       AND ($6::text IS NULL OR c.work_id = $6)
       AND (c.end_chapter > $2 OR (c.end_chapter = $2 AND c.end_verse >= $3))
       AND (c.start_chapter < $4 OR (c.start_chapter = $4 AND c.start_verse <= $5))
     ORDER BY c.work_id, c.start_chapter, c.start_verse
     LIMIT 32`,
    [
      asked.start.book,
      asked.start.chapter,
      asked.start.verse,
      asked.end.chapter,
      asked.end.verse,
      workId ?? null,
    ],
  );
  return rows.map((r) => toHit(r));
}

function rrf(lists: { id: number }[][]): Map<number, number> {
  const scores = new Map<number, number>();
  for (const list of lists) {
    list.forEach((item, i) => {
      scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (RRF_K + i + 1));
    });
  }
  return scores;
}

export async function search(
  pool: pg.Pool,
  query: string,
  kind?: WorkKind,
  workId?: string,
): Promise<ChunkHit[]> {
  const extra: string[] = [];
  const args: unknown[] = [];
  const add = (value: unknown, sql: string) => {
    args.push(value);
    extra.push(sql.replace("?", `$${args.length}`));
  };

  const qLex = query;
  args.push(qLex);
  const qIdx = args.length;
  if (kind) add(kind, "c.kind = ?");
  if (workId) add(workId, "c.work_id = ?");
  const where = extra.length ? `AND ${extra.join(" AND ")}` : "";

  const { rows: lex } = await pool.query<ChunkRow & { id: number }>(
    `SELECT c.id, ${CHUNK_COLS}
     FROM chunks c
     JOIN works w ON w.work_id = c.work_id
     WHERE to_tsvector('english', c.text) @@ plainto_tsquery('english', $${qIdx})
       ${where}
     ORDER BY ts_rank(to_tsvector('english', c.text), plainto_tsquery('english', $${qIdx})) DESC
     LIMIT ${CANDIDATES}`,
    args,
  );

  const [vector] = await embedTexts([QUERY_PREFIX + query]);
  const vecArgs: unknown[] = [`[${vector!.join(",")}]`, MODEL_ID];
  const vecExtra: string[] = [];
  if (kind) {
    vecArgs.push(kind);
    vecExtra.push(`c.kind = $${vecArgs.length}`);
  }
  if (workId) {
    vecArgs.push(workId);
    vecExtra.push(`c.work_id = $${vecArgs.length}`);
  }
  const vecWhere = vecExtra.length ? `AND ${vecExtra.join(" AND ")}` : "";
  const { rows: vec } = await pool.query<ChunkRow & { id: number }>(
    `SELECT c.id, ${CHUNK_COLS}
     FROM chunks c
     JOIN works w ON w.work_id = c.work_id
     WHERE c.embedding IS NOT NULL AND c.model_id = $2
       ${vecWhere}
     ORDER BY c.embedding <=> $1::vector
     LIMIT ${CANDIDATES}`,
    vecArgs,
  );

  const scores = rrf([lex, vec]);
  const byId = new Map<number, ChunkRow & { id: number }>();
  for (const row of [...lex, ...vec]) byId.set(row.id, row);
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_K)
    .map(([id, score]) => toHit(byId.get(id)!, score));
}
