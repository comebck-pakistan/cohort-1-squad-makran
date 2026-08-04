import {
  inngest,
  type TicketAgentAssigned,
  type TicketPlanDecision,
  type TicketReviewDecision,
} from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/service";
import { generatePlan, generateFileChanges, formatPlanSummary } from "@/lib/llm/agent";
import { ensureBranch, commitFiles, openPullRequest, mergePullRequest, getCheckStatus, verifyRepoAccess } from "@/lib/github";
import { updateTicket } from "@/lib/db/tickets";
import { getGithubAccessToken, updateIntegration } from "@/lib/db/integrations";
import type { TicketRow } from "@/types/db";

const MAX_ATTEMPTS = 3;
const DECISION_TIMEOUT = "1d";
const MAX_CI_POLLS = 15;

type ServiceClient = ReturnType<typeof createServiceClient>;

async function appendLog(
  supabase: ServiceClient,
  runId: string,
  text: string,
  ok?: boolean
): Promise<void> {
  const { data } = await supabase.from("agent_runs").select("log").eq("id", runId).single();
  const log = Array.isArray(data?.log) ? data.log : [];
  log.push({ time: new Date().toISOString(), text, ok });
  await supabase.from("agent_runs").update({ log }).eq("id", runId);
}

/**
 * Writes ticket.state and emits `ticket/state-changed`, both inside the same step.run call site
 * so a replayed/memoized step never re-sends the event (M5's log-append pattern, same reasoning).
 */
async function setTicketState(
  supabase: ServiceClient,
  ticketId: string,
  patch: Partial<Omit<TicketRow, "id" | "owner_id" | "created_at">> & { state: TicketRow["state"] }
): Promise<void> {
  await updateTicket(supabase, ticketId, patch);
  await inngest.send({ name: "ticket/state-changed", data: { ticketId, state: patch.state } });
}

/**
 * Single durable function for the whole plan/approve/execute/review loop (docs/agentic-os-build-plan.md M5).
 * Domain-level retry cap of 3, separate from Inngest's own transient-failure retry: each loop
 * iteration is one attempt, whether it ends in a CI failure or a human "request changes."
 */
export const agentRun = inngest.createFunction(
  {
    id: "agent-run",
    triggers: [{ event: "ticket/agent-assigned" }],
    // Safety net for crashes that exhaust Inngest's own retries (revoked GitHub token,
    // persistent OpenAI/GitHub 5xx, etc): without this the ticket is left stuck in whatever
    // state the loop was in, invisible to the user forever.
    onFailure: async ({ event, error, step }) => {
      const original = event.data.event.data as TicketAgentAssigned;
      const supabase = createServiceClient();
      await step.run("mark-needs-human-on-crash", () =>
        setTicketState(supabase, original.ticketId, {
          state: "needs_human",
          failure_reason: (error.message ?? "An unexpected error stopped the agent.").slice(0, 500),
        })
      );
      if (error.message?.startsWith("github_auth_failed")) {
        await step.run("mark-github-integration-error", async () => {
          const { data: ticket } = await supabase
            .from("tickets")
            .select("owner_id")
            .eq("id", original.ticketId)
            .single();
          if (!ticket) return;
          const { data: integration } = await supabase
            .from("integrations")
            .select("id")
            .eq("owner_id", ticket.owner_id)
            .eq("category", "repo")
            .eq("provider", "github")
            .maybeSingle();
          if (integration) await updateIntegration(supabase, integration.id, { status: "error" });
        });
      }
    },
  },
  async ({ event, step }) => {
    const { ticketId } = event.data as TicketAgentAssigned;
    const supabase = createServiceClient();

    const ticket = await step.run("load-ticket", async () => {
      const { data, error } = await supabase.from("tickets").select("*").eq("id", ticketId).single();
      if (error) throw error;
      return data;
    });

    if (!ticket.repo_id) {
      const reason = "No repo connected to this ticket.";
      await step.run("no-repo-needs-human", () =>
        setTicketState(supabase, ticketId, { state: "needs_human", failure_reason: reason })
      );
      return { status: "needs_human" as const, reason };
    }

    const repo = await step.run("load-repo", async () => {
      const { data, error } = await supabase.from("repos").select("*").eq("id", ticket.repo_id!).single();
      if (error) throw error;
      return data;
    });

    const githubToken = await step.run("load-github-token", () => getGithubAccessToken(supabase, ticket.owner_id));
    if (!githubToken) {
      const reason = "GitHub is not connected.";
      await step.run("no-github-token-needs-human", () =>
        setTicketState(supabase, ticketId, { state: "needs_human", failure_reason: reason })
      );
      return { status: "needs_human" as const, reason };
    }

    let feedback: string | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const run = await step.run(`create-run-${attempt}`, async () => {
        const { data, error } = await supabase
          .from("agent_runs")
          .insert({
            owner_id: ticket.owner_id,
            ticket_id: ticketId,
            attempt_number: attempt,
            files_touched_count: 0,
            token_cost: 0,
            log: [],
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      });

      const { plan, costCents: planCost } = await step.run(`plan-${attempt}`, () =>
        generatePlan({
          ticketTitle: ticket.title,
          ticketDescription: ticket.plan_summary ?? "",
          repoFullName: repo.full_name,
          feedback,
        })
      );

      await step.run(`save-plan-${attempt}`, async () => {
        await setTicketState(supabase, ticketId, {
          state: "awaiting_plan_approval",
          plan_summary: formatPlanSummary(plan),
          attempt_count: attempt,
        });
        await supabase.from("agent_runs").update({ token_cost: planCost }).eq("id", run.id);
      });
      await step.run(`log-plan-${attempt}`, () =>
        appendLog(supabase, run.id, `Plan generated: ${plan.files.length} file(s) proposed`, true)
      );

      const planDecision = await step.waitForEvent(`plan-decision-${attempt}`, {
        event: "ticket/plan-decision",
        timeout: DECISION_TIMEOUT,
        match: "data.ticketId",
      });
      const planData = planDecision?.data as TicketPlanDecision | undefined;

      if (!planData || planData.approved === false) {
        feedback = planData?.feedback ?? "Plan rejected without specific feedback.";
        await step.run(`log-plan-rejected-${attempt}`, () =>
          appendLog(supabase, run.id, planData ? "Plan rejected, re-planning" : "Plan approval timed out", false)
        );
        if (attempt === MAX_ATTEMPTS) {
          const reason = "Plan rejected at max attempts.";
          await step.run(`needs-human-plan-${attempt}`, () =>
            setTicketState(supabase, ticketId, { state: "needs_human", failure_reason: reason })
          );
          return { status: "needs_human" as const, reason };
        }
        continue;
      }

      await step.run(`set-executing-${attempt}`, () => setTicketState(supabase, ticketId, { state: "executing" }));

      const repoInfo = await step.run(`repo-info-${attempt}`, () => verifyRepoAccess(githubToken, repo.full_name));
      const branch = `agent/${ticketId}-${attempt}`;
      await step.run(`branch-${attempt}`, () => ensureBranch(githubToken, repo.full_name, repoInfo.defaultBranch, branch));
      await step.run(`log-branch-${attempt}`, () => appendLog(supabase, run.id, `Checked out branch: ${branch}`, true));

      const changes = await step.run(`generate-changes-${attempt}`, () =>
        generateFileChanges({ ticketTitle: ticket.title, ticketDescription: ticket.plan_summary ?? "", plan })
      );

      await step.run(`commit-${attempt}`, () => commitFiles(githubToken, repo.full_name, branch, changes.files, changes.commitMessage));
      await step.run(`log-commit-${attempt}`, async () => {
        await supabase
          .from("agent_runs")
          .update({ files_touched_count: changes.files.length, token_cost: planCost + changes.costCents })
          .eq("id", run.id);
        await appendLog(supabase, run.id, `Committed ${changes.files.length} file(s) to ${branch}`, true);
      });

      let ciStatus: "pending" | "success" | "failure" = "pending";
      for (let poll = 0; poll < MAX_CI_POLLS; poll++) {
        ciStatus = await step.run(`poll-ci-${attempt}-${poll}`, () => getCheckStatus(githubToken, repo.full_name, branch));
        if (ciStatus !== "pending") break;
        await step.sleep(`ci-wait-${attempt}-${poll}`, "20s");
      }
      await step.run(`log-ci-${attempt}`, () =>
        appendLog(supabase, run.id, `CI ${ciStatus === "success" ? "passed" : ciStatus === "failure" ? "failed" : "timed out"}`, ciStatus === "success")
      );

      if (ciStatus !== "success") {
        feedback = `The test suite did not pass on attempt ${attempt}. Fix the failing checks.`;
        if (attempt === MAX_ATTEMPTS) {
          const reason = "CI failed at max attempts.";
          await step.run(`needs-human-ci-${attempt}`, () =>
            setTicketState(supabase, ticketId, { state: "needs_human", failure_reason: reason })
          );
          return { status: "needs_human" as const, reason };
        }
        continue;
      }

      const pr = await step.run(`open-pr-${attempt}`, () =>
        openPullRequest(githubToken, {
          fullName: repo.full_name,
          head: branch,
          base: repoInfo.defaultBranch,
          title: ticket.title,
          body: `${plan.summary}\n\nOpened by Solvo Agent. Attempt ${attempt} of ${MAX_ATTEMPTS}.`,
        })
      );

      await step.run(`set-review-${attempt}`, () => setTicketState(supabase, ticketId, { state: "review", pr_url: pr.url }));
      await step.run(`log-pr-${attempt}`, () => appendLog(supabase, run.id, `PR opened: ${pr.url}`, true));

      const reviewDecision = await step.waitForEvent(`review-decision-${attempt}`, {
        event: "ticket/review-decision",
        timeout: DECISION_TIMEOUT,
        match: "data.ticketId",
      });
      const reviewData = reviewDecision?.data as TicketReviewDecision | undefined;

      if (reviewData?.approved) {
        await step.run(`merge-pr-${attempt}`, () => mergePullRequest(githubToken, repo.full_name, pr.number));
        await step.run(`set-done-${attempt}`, () => setTicketState(supabase, ticketId, { state: "done" }));
        await step.run(`log-merged-${attempt}`, () => appendLog(supabase, run.id, "PR merged", true));
        return { status: "done" as const, prUrl: pr.url };
      }

      feedback = reviewData?.feedback ?? "Review timed out waiting for a decision.";
      await step.run(`log-changes-requested-${attempt}`, () =>
        appendLog(supabase, run.id, reviewData ? "Changes requested, re-planning" : "Review approval timed out", false)
      );

      if (attempt === MAX_ATTEMPTS) {
        const reason = "Changes requested at max attempts.";
        await step.run(`needs-human-review-${attempt}`, () =>
          setTicketState(supabase, ticketId, { state: "needs_human", failure_reason: reason })
        );
        return { status: "needs_human" as const, reason };
      }

      await step.run(`set-changes-requested-${attempt}`, () =>
        setTicketState(supabase, ticketId, { state: "changes_requested" })
      );
    }

    return { status: "needs_human" as const, reason: "Exhausted attempts." };
  }
);
