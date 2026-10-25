# Bible RAG

An API, served as an MCP server, for retrieving Holy Bible text, Bible commentary, and other scholarly works, with citations.

The system is retrieval-first: it looks up and ranks passages and source excerpts, then returns them. It does not generate theology.

Commentary and other scholarship are different kinds of work. Commentary is written *on* a passage. A dictionary, systematic theology, or history may cite Scripture without being commentary on one range.

**Stack:** TypeScript (Node). Embeddings and MCP come from `@jbcbdse/charlie-*`, published to [GitHub Packages](https://npm.pkg.github.com) (not npmjs). Charlie generates vectors and exposes `ITool[]`; this app owns ingest, chunking, Postgres, and hybrid search.

Install needs a GitHub token with `read:packages` and an `.npmrc` scoped to the org:

```
@jbcbdse:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
export NODE_AUTH_TOKEN="$(gh auth token)"   # needs read:packages
npm install
```

## Constraints

- Ingest only public-domain or explicitly licensed texts. Record license, source, and attribution for every work.
- Prefer structured sources (USFM, OSIS, SWORD, official APIs) over scraped HTML.
- Every retrieved chunk must cite work and license. Bible and commentary chunks also cite their passage range. Scholarly chunks cite `references` when present.
- Do not mix translations inside a single chunk.

Recommended starting corpus: public-domain translations from [eBible](https://ebible.org/) or CrossWire SWORD (KJV, ASV, WEB, YLT, Darby). Add commentary and other scholarly works only when the license is clear (e.g. older public-domain commentaries; public-domain theologies and dictionaries).

## Canonical references

Book names and verse numbering differ across translations. Normalize everything to a stable reference before storage.

- Book id: OSIS codes (`GEN`, `1JN`, `PSA`), not display names.
- Reference: `{ book, chapter, verse }` plus a `versification` scheme (e.g. `eng`, `lxx`, `heb`).
- Display names (`Genesis`, `1 John`) are a lookup layer over book ids.
- Cross-translation compare maps each work onto the same logical range; if versification differs, return the mapped range and note the mismatch.

## Data model

### Passage

A closed range of Scripture. Shared by Bible chunks, commentary, and citations.

```
{
  start: { book: string; chapter: number; verse: number };  // OSIS book id
  end: { book: string; chapter: number; verse: number };
}
```

A single verse is `start === end`. Versification is taken from the work (or from the Bible edition the citation maps to).

### Work

A translation, a commentary volume, or another scholarly work (dictionary, systematic theology, history, monograph). Commentary is not a bucket for every book that mentions the Bible.

```
{
  workId: string;          // "web", "matthew-henry", "calvin-institutes"
  kind: "translation" | "commentary" | "scholarship";
  title: string;
  publisher?: string;
  language: string;        // BCP-47, e.g. "en"
  license: string;         // "public-domain", SPDX, or URL
  attribution: string;
  versification?: string;  // translations; also the scheme citations normalize to
  tradition?: string;      // "reformed", "patristic", "catholic", …
  year?: number;
}
```

### Verse

One verse in one translation. Used for exact lookup and as the unit for assembling passages.

```
{
  workId: string;
  book: string;            // OSIS id
  chapter: number;
  verse: number;
  text: string;
}
```

### Bible chunk

Embedded unit of Biblical text for semantic search. Prefer passage/paragraph boundaries already present in USFM over LLM chunking. Overlap by 1–2 verses when a unit is long. The chunk *is* the passage.

```
{
  start: { book: string; chapter: number; verse: number };
  end: { book: string; chapter: number; verse: number };
  translation: string;     // workId
  chunk: string;
  embedding: number[];
}
```

### Commentary chunk

A studied author writes academic explanation and interpretation *of* a Biblical passage. Many commentaries are not free; acquire those that are, mixing contemporary and older sources.

Every commentary chunk corresponds to exactly one primary **passage** (start → end). That is the text the excerpt is commentary on — from the source’s heading or lemma, not inferred from incidental citations. A chunk that cannot be assigned a primary passage is not commentary; treat the work (or that section) as scholarship.

Both commentary and scholarship may also list **references**: passages cited or alluded to that are *not* the primary target.

```
{
  passage: {
    start: { book: string; chapter: number; verse: number };
    end: { book: string; chapter: number; verse: number };
  };
  references: {
    start: { book: string; chapter: number; verse: number };
    end: { book: string; chapter: number; verse: number };
  }[];
  book: {
    workId: string;          // "matthew-henry"
    title: string;           // "Commentary on the Whole Bible"
    author: string;          // "Matthew Henry"
    year?: number;
    publisher?: string;
    language: string;
    license: string;
    attribution: string;
    tradition?: string;
    series?: string;
    volume?: string;         // "John", "Vol. 5"
  };
  chunk: string;
  embedding: number[];
}
```

`passage` is required. `references` does not include `passage`.

### Scholarship chunk

Other scholarly works (Calvin’s *Institutes*, a Bible dictionary, a history of Israel, a monograph) are not structured as commentary on one range. A chunk **may** lack a primary passage. It may still cite Scripture in `references`.

```
{
  passage?: {
    start: { book: string; chapter: number; verse: number };
    end: { book: string; chapter: number; verse: number };
  };
  references: {
    start: { book: string; chapter: number; verse: number };
    end: { book: string; chapter: number; verse: number };
  }[];
  book: {
    workId: string;          // "calvin-institutes", "easton-dictionary"
    title: string;
    author: string;
    year?: number;
    publisher?: string;
    language: string;
    license: string;
    attribution: string;
    tradition?: string;
    series?: string;
    volume?: string;
  };
  chunk: string;
  embedding: number[];
}
```

`passage`, if present, is only used when a section is genuinely lemmatic (rare). Do not promote a frequently cited verse into `passage`. Store verses and chunks separately. Verses answer “what does WEB say at John 3:16?” Bible chunks answer “where does Scripture talk about living water?” Commentary answers “what does Henry say *on* John 3:16?” Scholarship answers “who discusses new birth, and which passages do they cite?”

## Retrieval

Use hybrid search, not embeddings alone.

1. **Reference lookup** — parse `John 3:16–18` (or OSIS) and read verses directly.
2. **Lexical search** — BM25 / full-text on verse and chunk text for distinctive wording.
3. **Vector search** — cosine similarity on chunk embeddings for thematic queries.
4. **Merge** — Reciprocal Rank Fusion, then filter by `workId`, book, or testament if the caller asked.

Always return citations. Commentary hits always include `passage`. Scholarship and commentary hits include `references` when stored.

Recommended defaults: one generator for all English works; persist `modelId` with every vector; chunk ~200–500 tokens; overlap 1–2 verses; top-k 8 after fusion. Do not search a corpus with a different generator than the one that wrote it.

## Embeddings

**Model:** [Qwen/Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B). The stored identity is the weights, not the inference server.

| | |
| --- | --- |
| Hugging Face | `Qwen/Qwen3-Embedding-0.6B` |
| License | Apache-2.0 |
| Dimensions | 1024 (`vector(1024)` in pgvector) |
| Context | 32k tokens (Henry-sized lemmas will not silently truncate) |
| Persist as | `Qwen/Qwen3-Embedding-0.6B` |

This repo’s default runner is local Ollama (`qwen3-embedding:0.6b`). That is wiring, not the contract. Another consumer uses the same weights through transformers, llama.cpp, vLLM, or an OpenAI-compatible endpoint — Charlie already swaps generators behind `TextEmbeddingGenerator`. Query vectors match stored chunks if the weights, prefixes, and pooling match; do not mix a GGUF quant with official fp16 in one index.

The corpus is still empty of vectors, so there is no migration cost. Charlie’s Ollama default is `nomic-embed-text`; that is convenience, not a constraint. Qwen 0.6B is still a small local model (~0.6–1.2 GB) and is the better retrieval encoder (MTEB-eng-v2 vs nomic’s older ~62 mean). Thematic queries (“living water”) are exactly where that gap shows up; BM25 will not cover it.

Keep nomic only if CPU RAM is too tight for 0.6B. Skip `mxbai-embed-large` (512-token cap). A later jump to `Qwen/Qwen3-Embedding-4B` is a full re-embed.

```ts
import { OllamaTextEmbeddingGenerator } from "@jbcbdse/charlie-ollama";

const embeddings = new OllamaTextEmbeddingGenerator({
  modelId: "qwen3-embedding:0.6b", // Ollama tag; persist HF id on rows
});
```

```bash
ollama pull qwen3-embedding:0.6b
```

Qwen is instruction-aware. Apply prefixes in `src/embed/` before `getEmbedding` — Charlie does not add them, and they are the same on every backend:

- chunks (ingest): raw text, no prefix
- queries (`search`):

```
Instruct: Given a Bible or commentary search query, retrieve the most relevant passage.
Query: ${text}
```

Persist `modelId` (`Qwen/Qwen3-Embedding-0.6B`) on every chunk row. Filter vector search to that id. Changing models is a full re-embed, not a config flip.

## MCP server

Each tool is a Charlie `BaseTool` (`@jbcbdse/charlie-core`): Zod `schema`, `handler`, JSON Schema via `jsonSchema`. `@jbcbdse/charlie-mcp-server` exposes that `ITool[]` as MCP `tools/list` + `tools/call`. v1 is tools-only — Charlie’s server does not serve MCP resources.

| Tool | Purpose |
| --- | --- |
| `list_works` | Translations, commentaries, and scholarly works, with license metadata |
| `lookup_passage` | Exact range in one translation (`John 3:16-18`, `WEB`) |
| `search` | Hybrid search; filter by `kind` (translation / commentary / scholarship) |
| `compare_translations` | Same range across two or more translations |
| `get_commentary` | Commentary chunks whose **primary `passage`** overlaps the asked range |

`get_commentary` does not search scholarship, and it does not match on `references` alone. A scholarly work that merely cites John 3:16 is not commentary on John 3:16. Use `search` with `kind: scholarship` (optionally filtered by `references` overlap) for that.

Arguments should accept human references and OSIS. Handlers return a JSON string: `workId`, license, text, and the relevant `passage` / `references` / `book` object. No generated theology.

### Transport

v1 is **Streamable HTTP**, not stdio. `@jbcbdse/charlie-mcp-server`’s `CharlieMcpHttpHandler` mounts at `/mcp` (`POST`/`GET`/`DELETE`). Same `ITool[]` as a future stdio entrypoint; do not duplicate handlers.

**HTTP server:** Node’s built-in [`node:http`](https://nodejs.org/api/http.html) (`createServer`). Not Express, Fastify, Nest, or Koa. Charlie’s `handle(req, res)` already speaks Node `IncomingMessage` / `ServerResponse`, so a framework adds nothing. No extra npm dependency.

```ts
import { createServer } from "node:http";
import { CharlieMcpHttpHandler } from "@jbcbdse/charlie-mcp-server";

const mcpHandler = new CharlieMcpHttpHandler({
  name: "bible-rag",
  version: "0.1.0",
  tools,
});

createServer((req, res) => {
  const path = req.url?.split("?")[0];
  if (path === "/mcp") return void mcpHandler.handle(req, res);
  res.writeHead(404).end();
}).listen(Number(process.env.MCP_PORT ?? 8787), "127.0.0.1");
```

| | |
| --- | --- |
| Server | `node:http` (`createServer`) |
| Bind | `127.0.0.1` (local only; no auth in v1) |
| Port | `MCP_PORT` (default **8787**) |
| Path | `/mcp` |
| Entry | `src/mcp.ts` |

Postgres stays on **5433**. Do not share that port. Bind loopback until there is real auth; do not trust MCP `_meta` for identity.

stdio (`CharlieMcpStdioServer.serve()`) is optional later for hosts that spawn a child process. HTTP is the default.

## Architecture

TypeScript throughout. Two entrypoints share one store: **ingest** (batch CLI) and **MCP** (HTTP via Charlie). The MCP host is the client.

```
 MCP host
    │  Streamable HTTP  http://127.0.0.1:8787/mcp
    │  tools/list · tools/call
    ▼
 ┌──────────────────────────────────┐
 │ CharlieMcpHttpHandler            │
 │   ITool[] (BaseTool handlers)    │
 └────────────────┬─────────────────┘
                  ▼
 ┌──────────────────────────────────┐
 │ retrieve: lookup · BM25 · vector │
 └────────────────┬─────────────────┘
                  ▼
       ┌─────────────────────┐
       │  store (Postgres)   │
       │  works · verses     │
       │  chunks + vectors   │
       └──────────▲──────────┘
                  │
 ┌────────────────┴─────────────────┐
 │ ingest: parse · normalize        │
 │ chunk · TextEmbeddingGenerator   │
 │ load                             │
 └────────────────▲─────────────────┘
                  │
           raw corpus (USFM/OSIS)
```

### Components

**Corpus.** On-disk originals under `corpus/translations/`, `corpus/commentary/`, and `corpus/scholarship/` (plus `corpus/sword/` for unextracted CrossWire modules). USFM/OSIS/SWORD for Bibles; structured or marked-up prose for the rest. Each work has a manifest (`workId`, `kind`, license, attribution). Nothing enters the store without a manifest.

`corpus/` is a **local cache**. Do not commit it (`.gitignore`). The source of truth in git is [`WORKS.md`](WORKS.md): every acquired work lists its upstream URL (`usfm`, `source`, or CrossWire module). Rebuild with the fetch scripts and those URLs; ingest then loads from `corpus/` into Postgres. The Docker volume is the serving store, not a backup of the texts.

- Translations: eBible zip URLs in `WORKS.md`; keep `copr.htm`.
- HelloAO commentary: `npx tsx scripts/fetch-helloao-commentaries.ts`
- Douay notes: GitHub repo URL in `WORKS.md`
- SWORD: CrossWire PD modules; extract later

`.tmp/` is also gitignored (download scratch).

**Ingest.** A CLI/job, not the MCP process.

1. Parse structured text into verses (translations) or sectioned prose (commentary / scholarship).
2. Normalize book names to OSIS and attach `versification`.
3. Chunk Bible text on existing paragraph/pericope boundaries; overlap 1–2 verses when a unit is long. Chunk commentary on the source’s lemma (one primary `passage` per chunk). Chunk scholarship on headings or length; do not invent a primary `passage`. Extract `references` from explicit citations in both secondary kinds.
4. Embed each chunk with a Charlie `TextEmbeddingGenerator` (`getEmbedding({ text })` → `{ modelId, embedding }`). Write `works`, `verses`, and `chunks` including `modelId`.

Idempotent on `workId`: re-ingest replaces that work’s rows.

**Store.** Postgres + `pgvector` + full-text search.

| Table | Holds |
| --- | --- |
| `works` | Volume: `kind` translation / commentary / scholarship |
| `verses` | One row per `workId + book + chapter + verse` |
| `chunks` | Bible, commentary, or scholarship excerpt; `embedding`; `modelId`; Bible `start`/`end`; commentary `passage` (required); optional scholarship `passage`; `references` (jsonb) for both secondary kinds; denormalized `book` metadata |

Unique key on verses prevents duplicate references. HNSW (or IVFFlat) on `chunks.embedding vector(1024)`; GIN on verse/chunk text for BM25-style ranking.

**Retrieve.** Shared library used by MCP tools.

1. Parse human (`John 3:16-18`) or OSIS refs.
2. **Lookup** — index read on `verses` (and assemble a range).
3. **Lexical** — `ts_rank` / BM25 on verse and chunk text.
4. **Vector** — cosine k-NN on chunk embeddings.
5. **Fuse** — Reciprocal Rank Fusion, then filter by work, book, testament, or kind.

Lookup never goes through the vector index. Compare-translations is N lookups plus versification mapping.

**MCP server.** `node:http` + `CharlieMcpHttpHandler` from `@jbcbdse/charlie-mcp-server` (`name`, `version`, `tools`), listening on `127.0.0.1:${MCP_PORT:-8787}` at `/mcp`. It does not ingest or generate commentary. Each `BaseTool.handler` calls retrieve and returns a citation JSON string. Not Express.

### Request paths

- `lookup_passage` / `compare_translations` → ref parse → `verses`.
- `search` → `TextEmbeddingGenerator.getEmbedding` on the query + lexical query → fuse `chunks` (same `modelId`, optional `kind` filter) → cite.
- `get_commentary` → `works.kind = commentary` and primary `passage` overlaps the asked range. No `references`-only match; no scholarship.
- `list_works` → `works`.

### Packages (Charlie)

| Package | Role |
| --- | --- |
| `@jbcbdse/charlie-core` | `TextEmbeddingGenerator`, `ITool`, `BaseTool` |
| `@jbcbdse/charlie-openai` / `-ollama` / `-bedrock` | Concrete generators (`OpenAiTextEmbeddingGenerator`, `OllamaTextEmbeddingGenerator`, Titan/Cohere) |
| `@jbcbdse/charlie-mcp-server` | `CharlieMcpHttpHandler` (v1 HTTP `/mcp`), `CharlieMcpStdioServer` (optional) |

All `@jbcbdse/*` packages resolve from `https://npm.pkg.github.com`. Swap the generator behind the interface; keep `modelId` on stored rows. Charlie does not store vectors or split text.

### Module layout

```
src/ingest.ts              batch CLI
src/mcp.ts                 HTTP listen; CharlieMcpHttpHandler at /mcp
src/tools.ts               BaseTool per MCP tool
src/parse/                 USFM/OSIS → verses; commentary / scholarship sections
src/ref.ts                 book-name and versification mapping
src/chunk/                 passage boundaries, overlap
src/embed/                 TextEmbeddingGenerator wiring
src/store/                 Postgres access
src/retrieve/              lookup, search, fuse
```

Ingest and the MCP entrypoint are separate `tsx`/`node` scripts that share `src/*`. Swap `pgvector` later without changing tool contracts.

## Phasing

1. Ingest 2–3 public-domain English translations; verse store; `list_works` + `lookup_passage`.
2. Passage chunks + embeddings; `search` (hybrid).
3. `compare_translations` and versification mapping.
4. Public-domain commentary: every chunk has a primary `passage`; `get_commentary` by overlap. Extract `references` but do not query with them here.
5. Public-domain scholarship (no required `passage`); `search` with `kind: scholarship`, including filter by `references` overlap.
