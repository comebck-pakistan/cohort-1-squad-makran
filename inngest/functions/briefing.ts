import { inngest, type MeetingConfirmed } from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/mail";
import { formatDateTime } from "@/lib/format";

/**
 * Fires 15 min before a known-client meeting. Reads cached client analysis, no new LLM call
 * (handoff hard rule). "Communication style" from the mock UI is flagged there as an unresolved
 * open question (no real data source yet), so it's left out of the real email rather than faked.
 */
export const preMeetingBriefing = inngest.createFunction(
  { id: "pre-meeting-briefing", triggers: [{ event: "meeting/confirmed" }] },
  async ({ event, step }) => {
    const { meetingId } = event.data as MeetingConfirmed;
    const supabase = createServiceClient();

    const meeting = await step.run("load-meeting", async () => {
      const { data, error } = await supabase.from("meetings").select("*").eq("id", meetingId).single();
      if (error) throw error;
      return data;
    });

    if (!meeting.known_client || !meeting.client_id) {
      return { skipped: true, reason: "not a known client" };
    }

    const fireAt = new Date(new Date(meeting.starts_at).getTime() - 15 * 60 * 1000);
    await step.sleepUntil("wait-until-15-min-before", fireAt);

    const client = await step.run("load-client", async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", meeting.client_id!).single();
      if (error) throw error;
      return data;
    });

    const pastProposals = await step.run("load-past-proposals", async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("title, state, outcome_reason")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    });

    const ownerEmail = await step.run("load-owner-email", async () => {
      const { data, error } = await supabase.auth.admin.getUserById(meeting.owner_id);
      if (error) throw error;
      return data.user.email!;
    });

    await step.run("send-briefing-email", async () => {
      const priceLine =
        client.price_band_min && client.price_band_max
          ? `Suggested range: ${client.price_band_min} to ${client.price_band_max}`
          : "Not enough history yet: no estimate shown.";

      const proposalsHtml = pastProposals.length
        ? pastProposals
            .map((p) => `<div>${p.title}: ${p.state.toUpperCase()} (${p.outcome_reason ?? "Awaiting response"})</div>`)
            .join("")
        : "<div>No past proposals with this client yet.</div>";

      await sendEmail({
        to: ownerEmail,
        subject: `Briefing: ${meeting.title} at ${formatDateTime(meeting.starts_at)}`,
        html: `
          <h2>${meeting.title}</h2>
          <p>${formatDateTime(meeting.starts_at)}</p>
          <h3>Bid verdict</h3>
          <p>${client.verdict ?? "New / Unverified"} (${client.confidence_tier})</p>
          <p>${client.payment_verified ? "Payment verified" : "Payment not verified"}${client.hires_count > 0 ? `, ${client.hires_count} hires` : ""}</p>
          <h3>Suggested price band</h3>
          <p>${priceLine}</p>
          <h3>Past proposals</h3>
          ${proposalsHtml}
        `,
      });
    });

    return { sent: true, to: ownerEmail };
  }
);
