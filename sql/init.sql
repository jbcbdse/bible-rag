CREATE EXTENSION IF NOT EXISTS vector;

DO $$ BEGIN
  CREATE TYPE work_kind AS ENUM ('translation', 'commentary', 'scholarship');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS works (
  work_id TEXT PRIMARY KEY,
  kind work_kind NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  publisher TEXT,
  language TEXT NOT NULL,
  license TEXT NOT NULL,
  attribution TEXT NOT NULL,
  versification TEXT,
  tradition TEXT,
  year INT,
  series TEXT
);

CREATE TABLE IF NOT EXISTS verses (
  work_id TEXT NOT NULL REFERENCES works(work_id) ON DELETE CASCADE,
  book TEXT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  text TEXT NOT NULL,
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  PRIMARY KEY (work_id, book, chapter, verse)
);

CREATE TABLE IF NOT EXISTS chunks (
  id BIGSERIAL PRIMARY KEY,
  work_id TEXT NOT NULL REFERENCES works(work_id) ON DELETE CASCADE,
  kind work_kind NOT NULL,
  text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  model_id TEXT,
  embedding vector(1024),
  start_book TEXT,
  start_chapter INT,
  start_verse INT,
  end_book TEXT,
  end_chapter INT,
  end_verse INT,
  "references" jsonb NOT NULL DEFAULT '[]',
  book_meta jsonb
);

CREATE TABLE IF NOT EXISTS embedding_cache (
  content_hash TEXT NOT NULL,
  model_id TEXT NOT NULL,
  embedding vector(1024) NOT NULL,
  PRIMARY KEY (content_hash, model_id)
);

CREATE INDEX IF NOT EXISTS verses_tsv_idx ON verses USING gin (tsv);
CREATE INDEX IF NOT EXISTS chunks_work_id_idx ON chunks (work_id);
CREATE INDEX IF NOT EXISTS chunks_hash_idx ON chunks (content_hash);
CREATE INDEX IF NOT EXISTS chunks_passage_idx
  ON chunks (start_book, start_chapter, start_verse);
CREATE INDEX IF NOT EXISTS chunks_tsv_idx
  ON chunks USING gin (to_tsvector('english', text));
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);
