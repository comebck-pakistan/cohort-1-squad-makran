import { inngest, type TicketStateChanged } from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/mail";
import { parseNotificationPrefs } from "@/lib/notifications";
import { createNotification } from "@/lib/db/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Reacts to every ticket state write (see agent-run.ts's setTicketState / tickets.ts's
 * assignAgentToTicket). `review` and `needs_human` are the two named fixed triggers, gated by
 * their own prefs; every other state only emails if the user opted into "every status change",
 * so turning that on notifies about transitions not already covered by a specific trigger.
 */
export const notify = inngest.createFunction(
  { id: "notify-ticket-state-changed", triggers: [{ event: "ticket/state-changed" }] },
  async ({ event, step }) => {
    const { ticketId, state } = event.data as TicketStateChanged;
    const supabase = createServiceClient();

    const ticket = await step.run("load-ticket", async () => {
      const { data, error } = await supabase.from("tickets").select("title, owner_id").eq("id", ticketId).single();
      if (error) throw error;
      return data;
    });

    const owner = await step.run("load-owner", async () => {
      const { data, error } = await supabase.auth.admin.getUserById(ticket.owner_id);
      if (error) throw error;
      return { email: data.user.email!, prefs: parseNotificationPrefs(data.user.user_metadata) };
    });

    const ticketUrl = `${APP_URL}/tickets/${ticketId}`;

    if (state === "review") {
      if (owner.prefs.prReadyInApp) {
        await step.run("create-pr-ready-notification", () =>
          createNotification(supabase, {
            owner_id: ticket.owner_id,
            type: "pr-ready",
            title: `PR ready: ${ticket.title}`,
            body: "The agent opened a PR and this ticket is ready for your review.",
            link: ticketUrl,
          })
        );
      }
      if (!owner.prefs.prReadyEmail) return { sent: false, reason: "prReadyEmail off" };
      await step.run("send-pr-ready-email", () =>
        sendEmail({
          to: owner.email,
          subject: `PR ready for review: ${ticket.title}`,
          html: `<h2>${ticket.title}</h2><p>The agent opened a PR and this ticket is ready for your review.</p><p><a href="${ticketUrl}">${ticketUrl}</a></p>`,
        })
      );
      return { sent: true, trigger: "pr-ready" as const };
    }

    if (state === "needs_human") {
      if (owner.prefs.stuckInApp) {
        await step.run("create-needs-human-notification", () =>
          createNotification(supabase, {
            owner_id: ticket.owner_id,
            type: "needs-human",
            title: `Needs your help: ${ticket.title}`,
            body: "The agent hit its 3-attempt limit and needs your input to continue.",
            link: ticketUrl,
          })
        );
      }
      if (!owner.prefs.stuckEmail) return { sent: false, reason: "stuckEmail off" };
      await step.run("send-needs-human-email", () =>
        sendEmail({
          to: owner.email,
          subject: `Agent stuck, needs your help: ${ticket.title}`,
          html: `<h2>${ticket.title}</h2><p>The agent hit its 3-attempt limit and needs your input to continue.</p><p><a href="${ticketUrl}">${ticketUrl}</a></p>`,
        })
      );
      return { sent: true, trigger: "needs-human" as const };
    }

    if (!owner.prefs.everyChange) return { sent: false, reason: "everyChange off" };
    await step.run("send-status-change-email", () =>
      sendEmail({
        to: owner.email,
        subject: `Ticket status changed: ${ticket.title}`,
        html: `<h2>${ticket.title}</h2><p>New state: <strong>${state.replace(/_/g, " ")}</strong></p><p><a href="${ticketUrl}">${ticketUrl}</a></p>`,
      })
    );
    return { sent: true, trigger: "every-change" as const, state };
  }
);
