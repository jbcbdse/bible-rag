import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import type { Chunk, Verse, WorkManifest } from "./types.ts";
import { MODEL_ID } from "./embed.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function createPool(): pg.Pool {
  return new pg.Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgres://bible:bible@127.0.0.1:5433/bible",
  });
}

export async function applySchema(pool: pg.Pool): Promise<void> {
  const sql = await readFile(path.join(ROOT, "sql/init.sql"), "utf8");
  await pool.query(sql);
}

function vec(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function replaceWork(
  pool: pg.Pool,
  work: WorkManifest,
  verses: Verse[],
  chunks: Chunk[],
  embeddings: Map<string, number[]>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM works WHERE work_id = $1", [work.workId]);
    await client.query(
      `INSERT INTO works (
         work_id, kind, title, author, publisher, language, license,
         attribution, versification, tradition, year, series
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        work.workId,
        work.kind,
        work.title,
        work.author ?? null,
        work.publisher ?? null,
        work.language,
        work.license,
        work.attribution,
        work.versification ?? null,
        work.tradition ?? null,
        work.year ?? null,
        work.series ?? null,
      ],
    );

    for (let i = 0; i < verses.length; i += 500) {
      const batch = verses.slice(i, i + 500);
      const vals: unknown[] = [];
      const rows = batch.map((v, n) => {
        const o = n * 5;
        vals.push(v.workId, v.book, v.chapter, v.verse, v.text);
        return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5})`;
      });
      await client.query(
        `INSERT INTO verses (work_id, book, chapter, verse, text)
         VALUES ${rows.join(",")}`,
        vals,
      );
    }

    for (let i = 0; i < chunks.length; i += 200) {
      const batch = chunks.slice(i, i + 200);
      const vals: unknown[] = [];
      const rows = batch.map((c, n) => {
        const o = n * 14;
        const hash = hashText(c.text);
        const emb = embeddings.get(hash);
        vals.push(
          c.workId,
          c.kind,
          c.text,
          hash,
          emb ? MODEL_ID : null,
          emb ? vec(emb) : null,
          c.passage?.start.book ?? null,
          c.passage?.start.chapter ?? null,
          c.passage?.start.verse ?? null,
          c.passage?.end.book ?? null,
          c.passage?.end.chapter ?? null,
          c.passage?.end.verse ?? null,
          JSON.stringify(c.references),
          c.bookMeta ? JSON.stringify(c.bookMeta) : null,
        );
        return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6}::vector,$${o + 7},$${o + 8},$${o + 9},$${o + 10},$${o + 11},$${o + 12},$${o + 13}::jsonb,$${o + 14})`;
      });
      await client.query(
        `INSERT INTO chunks (
           work_id, kind, text, content_hash, model_id, embedding,
           start_book, start_chapter, start_verse,
           end_book, end_chapter, end_verse, "references", book_meta
         ) VALUES ${rows.join(",")}`,
        vals,
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function loadCachedEmbeddings(
  pool: pg.Pool,
  hashes: string[],
): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  for (let i = 0; i < hashes.length; i += 500) {
    const batch = hashes.slice(i, i + 500);
    const { rows } = await pool.query<{
      content_hash: string;
      embedding: string;
    }>(
      `SELECT content_hash, embedding::text AS embedding
       FROM embedding_cache
       WHERE model_id = $1 AND content_hash = ANY($2::text[])`,
      [MODEL_ID, batch],
    );
    for (const row of rows) {
      const nums = row.embedding
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map(Number);
      out.set(row.content_hash, nums);
    }
  }
  return out;
}

export async function saveEmbeddings(
  pool: pg.Pool,
  items: { hash: string; embedding: number[] }[],
): Promise<void> {
  for (let i = 0; i < items.length; i += 100) {
    const batch = items.slice(i, i + 100);
    const vals: unknown[] = [];
    const rows = batch.map((item, n) => {
      const o = n * 3;
      vals.push(item.hash, MODEL_ID, vec(item.embedding));
      return `($${o + 1},$${o + 2},$${o + 3}::vector)`;
    });
    await pool.query(
      `INSERT INTO embedding_cache (content_hash, model_id, embedding)
       VALUES ${rows.join(",")}
       ON CONFLICT (content_hash, model_id) DO NOTHING`,
      vals,
    );
    await pool.query(
      `UPDATE chunks c SET embedding = e.embedding, model_id = e.model_id
       FROM embedding_cache e
       WHERE c.content_hash = e.content_hash
         AND e.model_id = $1
         AND c.content_hash = ANY($2::text[])
         AND c.embedding IS NULL`,
      [MODEL_ID, batch.map((b) => b.hash)],
    );
  }
}

export async function missingChunkHashes(
  pool: pg.Pool,
  workId?: string,
): Promise<{ id: number; content_hash: string; text: string }[]> {
  const { rows } = await pool.query<{
    id: number;
    content_hash: string;
    text: string;
  }>(
    workId
      ? `SELECT id, content_hash, text FROM chunks
         WHERE embedding IS NULL AND work_id = $1`
      : `SELECT id, content_hash, text FROM chunks WHERE embedding IS NULL`,
    workId ? [workId] : [],
  );
  return rows;
}

export async function counts(pool: pg.Pool): Promise<{
  works: number;
  verses: number;
  chunks: number;
  embedded: number;
}> {
  const { rows } = await pool.query<{
    works: string;
    verses: string;
    chunks: string;
    embedded: string;
  }>(
    `SELECT
       (SELECT count(*) FROM works) AS works,
       (SELECT count(*) FROM verses) AS verses,
       (SELECT count(*) FROM chunks) AS chunks,
       (SELECT count(*) FROM chunks WHERE embedding IS NOT NULL) AS embedded`,
  );
  const r = rows[0]!;
  return {
    works: Number(r.works),
    verses: Number(r.verses),
    chunks: Number(r.chunks),
    embedded: Number(r.embedded),
  };
}
