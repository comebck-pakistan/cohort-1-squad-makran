import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { ticketizeMeeting } from "@/inngest/functions/ticketize";
import { preMeetingBriefing } from "@/inngest/functions/briefing";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ticketizeMeeting, preMeetingBriefing],
});
