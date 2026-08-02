import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const model = openai.chat("gpt-5-nano");

const draftTicketsSchema = z.object({
  tickets: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    })
  ),
});

export interface DraftTicket {
  title: string;
  description: string;
}

/**
 * Turns a meeting transcript into candidate tickets. Output is a draft, never written straight
 * to the `tickets` table (handoff hard rule: only promoted after a human confirms).
 */
export async function ticketizeTranscript(transcript: string): Promise<DraftTicket[]> {
  const { object } = await generateObject({
    model,
    schema: draftTicketsSchema,
    system:
      "You read freelance client-meeting transcripts and extract concrete, actionable engineering " +
      "tickets discussed or implied in the conversation. Each ticket needs a short title and a " +
      "description with enough context for a developer to start work. Skip small talk, scheduling, " +
      "and anything that isn't an actual piece of work. If nothing actionable was discussed, return " +
      "an empty list rather than inventing work.",
    prompt: `Meeting transcript:\n\n${transcript}`,
  });

  return object.tickets;
}
