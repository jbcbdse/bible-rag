# bible-rag

Retrieval-first Bible, commentary, and scholarship MCP server.

## What it is

bible-rag serves Bible text and public-domain commentary to MCP clients. It looks up and ranks passages. It returns them with citations: work, license, and passage range. It does not generate theology.

Retrieval-first means every answer traces to a stored source. Commentary and scholarship stay separate. A commentary chunk is on one primary passage. A scholarly work that only cites a verse is not commentary on it.

## MCP tools

The server (`src/mcp.ts`, `src/tools.ts`) exposes five tools:

| Tool | Purpose |
| --- | --- |
| `list_works` | List ingested works with license metadata |
| `lookup_passage` | Exact range in one translation (default `web`) |
| `compare_translations` | Same range in two or more translations |
| `search` | Hybrid lexical and vector search; filter by `kind` or `workId` |
| `get_commentary` | Commentary whose primary passage overlaps the range |

The transport is Streamable HTTP at `http://127.0.0.1:8787/mcp`. The server binds to loopback and has no auth.

## Architecture

```
corpus (USFM, HelloAO JSON)
  -> parse   (src/parse)   verses and sections, OSIS book ids
  -> chunk   (src/chunk)   paragraph boundaries, verse overlap
  -> embed   (src/embed.ts) Qwen3-Embedding-0.6B via Ollama
  -> store   (src/store.ts) Postgres + pgvector
  -> retrieve (src/retrieve.ts) lookup, full-text, vector, fusion
  -> tools   (src/tools.ts) MCP over node:http
```

- Ingest is a batch CLI (`src/ingest.ts`). It replaces a work's rows on re-ingest.
- Embeddings are cached by content hash and model id. Every chunk stores its `model_id`.
- `search` runs Postgres full-text search and pgvector cosine search. It merges both with Reciprocal Rank Fusion and returns the top 8.
- Passage lookup reads the `verses` table. It does not use the vector index.
- Schema: `sql/init.sql` (`works`, `verses`, `chunks`, `embedding_cache`; HNSW and GIN indexes).

## Tech stack

- TypeScript on Node, run with `tsx`
- Postgres 17 with pgvector (Docker image `pgvector/pgvector:pg17`)
- Ollama, model `qwen3-embedding:0.6b` (1024 dimensions)
- `@jbcbdse/charlie-core`, `-ollama`, and `-mcp-server` for tools, embeddings, and the MCP handler
- `pg`, `zod`

## Run it locally

The `@jbcbdse/*` packages come from GitHub Packages. You need a token with `read:packages`. `.npmrc` reads `NODE_AUTH_TOKEN`.

```bash
export NODE_AUTH_TOKEN="$(gh auth token)"
npm install
cp .env.example .env
npm run db:up                    # Postgres on port 5433
ollama pull qwen3-embedding:0.6b
npm run ingest                   # parse, chunk, embed, load
npm start                        # MCP server on port 8787
```

Other commands:

- `npm run ingest:text` loads text without embeddings.
- `npm run ingest -- --work web` or `--kind commentary` limits the run.
- `npx tsx scripts/fetch-helloao-commentaries.ts` downloads HelloAO commentary JSON into `corpus/commentary/`.
- `npm run db:down` stops the database.

Environment variables (`.env.example`):

- `DATABASE_URL` (`postgres://bible:bible@127.0.0.1:5433/bible`)
- `OLLAMA_BASE_URL` (`http://127.0.0.1:11434/v1`)
- `MCP_PORT` (`8787`)

Ingest reads from `corpus/`. Git ignores that directory. Translation USFM zips come from the eBible URLs in `WORKS.md`. No script downloads them.

## Data sources and licensing

`WORKS.md` is the source of truth for every work. It lists the upstream URL and license for each one.

- Translations: eBible USFM, all marked public domain (WEB, KJV, ASV, YLT, Darby, Webster, OEB, BBE, BSB, Douay-Rheims 1899, Geneva 1599, JPS 1917, RV 1895). The file notes that KJV printing in the UK is restricted by letters patent, and that this does not apply to the digital copy outside the UK. WORKS.md marks BBE as public domain in the US only. "World English Bible" is a trademark of eBible.org.
- Commentary from HelloAO: Henry, Jamieson-Fausset-Brown, Clarke, Gill, Calvin, and Keil-Delitzsch carry the CC Public Domain Mark. Tyndale Open Study Notes is CC BY-SA 4.0.
- Douay-Rheims annotations: CC0 1.0, from the `janvier-s/original-douay-rheims` repository.
- Not acquired: scholarship works (Easton, Smith, Hitchcock, Calvin's Institutes). Some CrossWire SWORD modules are downloaded but not extracted.
- Copyrighted texts (NASB, NET, ESV, and others) are out of scope.

## Status and limits

- Version 0.1.0. Not published as a package (`private: true`).
- `src/works.ts` defines 21 works: 13 translations and 8 commentaries.
- No scholarship content is ingested yet. `DESIGN.md` plans it.
- The server has no auth. It binds to 127.0.0.1 only.
- Embeddings need a local Ollama. Changing the embedding model needs a full re-embed.
- `DESIGN.md` plans versification mapping across translations. The code does not implement it yet.
- The repo has no tests and no license file. The README commands are not tested end to end.
