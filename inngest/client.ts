import { EventSchemas, Inngest } from "inngest";

type Events = {
  /** transcript is only set for manual_paste (typed at creation time); bot_recall fetches it via Recall's API inside the function. */
  "meeting/ready-for-processing": { data: { meetingId: string; transcript?: string } };
  "meeting/confirmed": { data: { meetingId: string } };
};

export const inngest = new Inngest({
  id: "agentic-os",
  schemas: new EventSchemas().fromRecord<Events>(),
});
