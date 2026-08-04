import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { ticketizeMeeting } from "@/inngest/functions/ticketize";
import { preMeetingBriefing } from "@/inngest/functions/briefing";
import { agentRun } from "@/inngest/functions/agent-run";
import { notify } from "@/inngest/functions/notify";
import { needsHumanDigest } from "@/inngest/functions/needs-human-digest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ticketizeMeeting, preMeetingBriefing, agentRun, notify, needsHumanDigest],
});
