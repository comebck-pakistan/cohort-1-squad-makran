export interface ProposalScenario {
  jobTitle: string;
  cachedLabel: string;
  badgeText: string;
  badgeSub: string;
  referenceNote: string;
  paragraphs: string[];
  charCount: number;
  rateNote: string;
  rateSource: string;
  gateText: string;
  primaryButtonSub: string;
  secondaryLabels: [string, string];
}

export const PROPOSAL_SCENARIOS: Record<"inVoice" | "surveyFallback", ProposalScenario> = {
  inVoice: {
    jobTitle: "Senior React Engineer for checkout rebuild",
    cachedLabel: "Cached · Aug 28",
    badgeText: "In your voice",
    badgeSub: "Based on 3 similar past proposals",
    referenceNote: "3 proposals used as reference",
    paragraphs: [
      "Hi, I've built checkout and payment flows for three e-commerce teams over the past two years, most recently rebuilding a cart-to-confirmation flow that cut drop-off by handling edge cases in address validation and saved-card retry logic.",
      "Your job post lines up closely with that work, I'd start by mapping the current flow, flagging where state gets lost between steps, then rebuilding incrementally so nothing ships broken.",
      "I'm available to start this week and can share the two most relevant past projects if useful. Happy to hop on a call first.",
    ],
    charCount: 312,
    rateNote: "Consider anchoring at $75–$90/hr based on this client's history.",
    rateSource: "from client avg rate paid",
    gateText: "Review before sending, you paste this into Upwork manually.",
    primaryButtonSub: "Copies to clipboard · marks proposal as Sent in Solvo",
    secondaryLabels: ["Regenerate", "Start over"],
  },
  surveyFallback: {
    jobTitle: "Landing Page Redesign for early-stage startup",
    cachedLabel: "Cached · Aug 28",
    badgeText: "Generated from your style preferences",
    badgeSub: "You have 0 past proposals. Once you send a few, drafts will match your actual voice.",
    referenceNote: "Style preferences used",
    paragraphs: [
      "Hello, I came across your landing page redesign post and think I'd be a strong fit. I focus on clean, conversion-minded front-end work and have shipped several redesigns for early-stage products.",
      "I'd start by reviewing your current page and goals, then propose a structure before touching any code, so we're aligned early.",
      "I'm available to begin soon and happy to share examples of past redesign work on a quick call.",
    ],
    charCount: 287,
    rateNote: "Consider anchoring at $60–$80/hr based on the posted budget.",
    rateSource: "from posted budget only · no client history",
    gateText: "Review carefully, this draft reflects preferences, not your past writing. Edit before sending.",
    primaryButtonSub: "Copies to clipboard · marks proposal as Sent in Solvo",
    secondaryLabels: ["Regenerate", "Edit preferences"],
  },
};
