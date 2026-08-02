import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "agentic-os", isDev: process.env.NODE_ENV !== "production" });

/** transcript is only set for manual_paste (typed at creation time); bot_recall fetches it via Recall's API inside the function. */
export interface MeetingReadyForProcessing {
  meetingId: string;
  transcript?: string;
}

export interface MeetingConfirmed {
  meetingId: string;
}

export interface TicketAgentAssigned {
  ticketId: string;
}

export interface TicketPlanDecision {
  ticketId: string;
  approved: boolean;
  feedback: string | null;
}

export interface TicketReviewDecision {
  ticketId: string;
  approved: boolean;
  feedback: string | null;
}

export interface TicketStateChanged {
  ticketId: string;
  state: string;
}
