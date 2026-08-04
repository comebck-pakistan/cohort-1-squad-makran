import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

/** Dimension of OpenAI's text-embedding-3-small, must match the `vector(1536)` column in migrations. */
export const EMBEDDING_DIMENSIONS = 1536;

const model = openai.embedding("text-embedding-3-small");

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({ model, value: text, maxRetries: 1 });
  return embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({ model, values: texts, maxRetries: 1 });
  return embeddings;
}
