import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const model = openai.chat("gpt-5-nano");

// gpt-5-nano pricing per M3's live pricing check: $0.05/1M input tokens, $0.40/1M output tokens.
export function costCents(usage: { inputTokens?: number; outputTokens?: number }): number {
  const input = usage.inputTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  return Math.round(((input / 1_000_000) * 0.05 + (output / 1_000_000) * 0.4) * 100);
}

const planSchema = z.object({
  summary: z.string(),
  files: z.array(z.object({ path: z.string(), note: z.string() })),
  outOfScope: z.string(),
});

export interface AgentPlan {
  summary: string;
  files: { path: string; note: string }[];
  outOfScope: string;
}

/**
 * Plan step of the plan/approve/execute/review loop. `feedback` carries the human's rejection
 * notes or the previous attempt's CI failure, folded into the next plan, never silently dropped.
 */
export async function generatePlan(input: {
  ticketTitle: string;
  ticketDescription: string;
  repoFullName: string;
  feedback?: string;
}): Promise<{ plan: AgentPlan; costCents: number }> {
  const { object, usage } = await generateObject({
    model,
    schema: planSchema,
    system:
      "You are a coding agent planning a small, focused change to a repo before writing any code. " +
      "Propose the minimal set of files to touch. Be explicit and honest about what you will not " +
      "touch, so a human reviewer can approve or reject with confidence.",
    prompt: [
      `Repo: ${input.repoFullName}`,
      `Ticket: ${input.ticketTitle}`,
      `Description: ${input.ticketDescription}`,
      input.feedback ? `Address this feedback from the previous attempt: ${input.feedback}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  return { plan: object, costCents: costCents(usage) };
}

/**
 * `tickets.plan_summary` is a single text column (no structured plan-files column exists), so the
 * plan's file list and out-of-scope note are folded into it for the approval-gate UI to render as-is.
 */
export function formatPlanSummary(plan: AgentPlan): string {
  const filesBlock = plan.files.map((f) => `- ${f.path} (${f.note})`).join("\n");
  return [plan.summary, `Files I plan to touch:\n${filesBlock}`, `What I will not do:\n${plan.outOfScope}`].join(
    "\n\n"
  );
}

const changesSchema = z.object({
  files: z.array(z.object({ path: z.string(), content: z.string() })),
  commitMessage: z.string(),
});

export interface AgentFileChange {
  path: string;
  content: string;
}

/** Execute step: turns an approved plan into real, full file contents to commit. */
export async function generateFileChanges(input: {
  ticketTitle: string;
  ticketDescription: string;
  plan: AgentPlan;
}): Promise<{ files: AgentFileChange[]; commitMessage: string; costCents: number }> {
  const { object, usage } = await generateObject({
    model,
    schema: changesSchema,
    system:
      "You are a coding agent executing an already-approved plan. Write the complete, final content " +
      "for each file the plan says you'll touch. Keep changes small and self-contained given you have " +
      "no access to the rest of the repo's current contents beyond the ticket description.",
    prompt: [
      `Ticket: ${input.ticketTitle}`,
      `Description: ${input.ticketDescription}`,
      `Approved plan: ${input.plan.summary}`,
      `Files to write: ${input.plan.files.map((f) => `${f.path} (${f.note})`).join(", ")}`,
    ].join("\n\n"),
  });

  return { ...object, costCents: costCents(usage) };
}
