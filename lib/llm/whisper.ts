import { transcribe } from "ai";
import { openai } from "@ai-sdk/openai";

const model = openai.transcription("whisper-1");

/** ~$0.006/min per docs/features.md. Used for manual audio upload and the caption-off fallback. */
export async function transcribeAudio(audio: Uint8Array | URL): Promise<string> {
  const { text } = await transcribe({ model, audio });
  return text;
}
