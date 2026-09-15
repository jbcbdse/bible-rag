import { OllamaTextEmbeddingGenerator } from "@jbcbdse/charlie-ollama";

export const MODEL_ID = "Qwen/Qwen3-Embedding-0.6B";
export const OLLAMA_MODEL = "qwen3-embedding:0.6b";

const OLLAMA = (
  process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1"
).replace(/\/v1\/?$/, "");

export function createEmbeddingGenerator() {
  return new OllamaTextEmbeddingGenerator({ modelId: OLLAMA_MODEL });
}

type OllamaEmbedResponse = { embeddings?: number[][]; embedding?: number[] };

/** Batch via Ollama native API; same weights Charlie uses one-at-a-time. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const resp = await fetch(`${OLLAMA}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, input: texts }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ollama embed ${resp.status}: ${err}`);
  }
  const data = (await resp.json()) as OllamaEmbedResponse;
  if (data.embeddings?.length === texts.length) return data.embeddings;
  if (data.embedding && texts.length === 1) return [data.embedding];
  throw new Error(`ollama embed: expected ${texts.length} vectors`);
}
