import { transcribe } from "ai";
import { openai } from "@ai-sdk/openai";

const model = openai.transcription("whisper-1");

/** ~$0.006/min per docs/features.md. Used for manual audio upload and the caption-off fallback. */
export async function transcribeAudio(audio: Uint8Array | URL): Promise<string> {
  // Kept at the SDK default (2), not raised: retries here cost real time/money, and the caller
  // already runs inside an Inngest step.run, which owns the outer retry budget.
  const { text } = await transcribe({ model, audio, maxRetries: 1 });
  return text;
}
