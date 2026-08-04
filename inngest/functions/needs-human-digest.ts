import { inngest } from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/mail";
import { parseNotificationPrefs } from "@/lib/notifications";
import { createNotification } from "@/lib/db/notifications";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Daily rollup, separate from notify.ts's one-time per-transition signal: catches tickets that
 * have been sitting in needs_human for days, not just the moment they first arrive there.
 */
export const needsHumanDigest = inngest.createFunction(
  { id: "needs-human-digest", triggers: [{ cron: "0 14 * * *" }] },
  async ({ step }) => {
    const supabase = createServiceClient();

    const stuck = await step.run("load-needs-human-tickets", async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, title, owner_id")
        .eq("state", "needs_human");
      if (error) throw error;
      return data;
    });

    if (stuck.length === 0) return { sent: 0 };

    const byOwner = new Map<string, typeof stuck>();
    for (const ticket of stuck) {
      byOwner.set(ticket.owner_id, [...(byOwner.get(ticket.owner_id) ?? []), ticket]);
    }

    let sent = 0;
    for (const [ownerId, tickets] of byOwner) {
      await step.run(`notify-owner-${ownerId}`, async () => {
        const { data, error } = await supabase.auth.admin.getUserById(ownerId);
        if (error) throw error;
        const prefs = parseNotificationPrefs(data.user.user_metadata);
        const title = `${tickets.length} ticket${tickets.length > 1 ? "s" : ""} need your help`;
        const body = tickets.map((t) => t.title).join(", ");
        const link = `${APP_URL}/tickets?filter=action`;

        if (prefs.stuckInApp) {
          await createNotification(supabase, { owner_id: ownerId, type: "needs-human", title, body, link });
        }
        if (prefs.stuckEmail && data.user.email) {
          await sendEmail({
            to: data.user.email,
            subject: title,
            html: `<h2>${title}</h2><p>${body}</p><p><a href="${link}">${link}</a></p>`,
          });
        }
      });
      sent++;
    }

    return { sent };
  }
);
