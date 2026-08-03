"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VerdictBadge } from "@/components/state/VerdictBadge";
import { ConfidenceTag } from "@/components/epistemic/ConfidenceTag";
import { StateChip } from "@/components/state/StateChip";
import styles from "./LandingScreen.module.css";

export function LandingScreen() {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function scrollToHow() {
    document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.brand}>Agentic OS</div>
        <div className={styles.navRight}>
          <a href="#how" className={styles.navLink}>
            How it works
          </a>
          {/* Pricing page not yet designed (open question, handoff §6). Dangling link kept as-is. */}
          <a href="#" className={styles.navLink}>
            Pricing
          </a>
          <Link href="/sign-in">
            <Button variant="secondary">Sign in</Button>
          </Link>
          <Button variant="primary" onClick={() => showToast("Thanks. You're on the early access list.")}>
            Get early access
          </Button>
        </div>
      </nav>

      <div className={styles.hero}>
        <div className={styles.heroEyebrow}>For freelance developers</div>
        <div className={styles.heroLine}>From job post to merged PR:</div>
        <div className={[styles.heroLine, styles.heroLineSignal].join(" ")}>you approve every step.</div>
        <div className={styles.heroBody}>
          Agentic OS researches clients, drafts proposals in your voice, captures meetings
          first-hand, converts them to tickets, and runs the agent, with a human gate at every
          meaningful decision.
        </div>
        <div className={styles.heroActions}>
          <Button
            variant="primary"
            style={{ height: 48, padding: "0 24px", fontSize: 15 }}
            onClick={() => showToast("Thanks. You're on the early access list.")}
          >
            Get early access
          </Button>
          <Button variant="secondary" style={{ height: 48, padding: "0 24px", fontSize: 15 }} onClick={scrollToHow}>
            See how it works
          </Button>
        </div>
        <div className={styles.heroNote}>Solo freelancers only in v1.0 · no credit card required</div>
      </div>

      <div className={styles.strip}>
        <div className={styles.stripInner}>
          <div className={styles.stripItem}>Human approves every gate</div>
          <div className={styles.stripItem}>No auto-bidding, ever</div>
          <div className={styles.stripItem}>Your voice, your proposals</div>
        </div>
      </div>

      <div id="how" className={styles.section}>
        <div className={styles.sectionTitle}>How it works</div>
        <div className={styles.howGrid}>
          <Card>
            <div className={styles.stepEyebrow}>01 · Research</div>
            <div className={styles.stepTitle}>Explain the client</div>
            <div className={[styles.stepBody, styles.stepBodyMb].join(" ")}>
              Analyzes Upwork history and job post. Returns a BID / NO-BID / MAYBE verdict with a
              confidence tier. Never fakes certainty when data is missing.
            </div>
            <div className={styles.chipRow}>
              <VerdictBadge verdict="BID" />
              <ConfidenceTag tier="full" />
            </div>
          </Card>
          <Card>
            <div className={styles.stepEyebrow}>02 · Propose</div>
            <div className={styles.stepTitle}>Draft in your voice</div>
            <div className={styles.stepBody}>
              Retrieves your most relevant past proposals and drafts a new one grounded in how you
              actually write. You edit, you send; the tool never submits for you.
            </div>
          </Card>
          <Card>
            <div className={styles.stepEyebrow}>03 · Capture</div>
            <div className={styles.stepTitle}>Meetings → tickets</div>
            <div className={styles.stepBody}>
              A bot joins your call first-hand via Skribby, no manual upload. You review draft
              tickets, merge or split, then confirm. Tickets only exist after your approval.
            </div>
          </Card>
          <Card>
            <div className={styles.stepEyebrow}>04 · Build</div>
            <div className={styles.stepTitle}>Agent runtime</div>
            <div className={[styles.stepBody, styles.stepBodyMb].join(" ")}>
              The agent produces a written plan first. You approve it. Then it executes with a
              live step log. You review the PR. Three gates, no black box.
            </div>
            <div className={styles.chipRow}>
              <StateChip state="awaiting_plan_approval" />
              <span className={styles.chipArrow}>→</span>
              <StateChip state="executing" />
              <span className={styles.chipArrow}>→</span>
              <StateChip state="review" />
            </div>
          </Card>
        </div>
      </div>

      <div className={styles.honestSection}>
        <div className={styles.honestInner}>
          <div className={styles.honestTitle}>Honest about what it knows</div>
          <div className={styles.honestBody}>Every number the product shows is marked by what it actually is.</div>
          <div className={styles.honestGrid}>
            <div className={styles.factCard}>
              <div className={styles.factHead}>
                <span className={styles.factMarkerVerified}>●</span>
                <span className={styles.factValueInk}>$0.062</span>
              </div>
              <div className={styles.factCaption}>ticketization + plan · logged · exact</div>
            </div>
            <div className={styles.predictionCard}>
              <div className={styles.factHead}>
                <span className={styles.factMarkerPredict}>≈</span>
                <span className={styles.factValuePredict}>$0.40–$1.20</span>
              </div>
              <div className={styles.factCaption}>based on 6 past runs · shown as a range</div>
            </div>
            <div className={styles.syntheticCard}>
              <div className={styles.syntheticPill}>EXAMPLE DATA</div>
              <div className={styles.syntheticCaption}>auto-hides once real data exists · never blended</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={[styles.featureGrid, styles.featureGridMb].join(" ")}>
          <div>
            <div className={styles.featureTitle}>Meeting bot: first-hand, no upload</div>
            <div className={styles.featureBody}>
              Paste a Zoom or Google Meet link. A Skribby bot joins as a participant. Transcript
              arrives after the call via webhook. If transcription comes back empty, it falls
              back to Whisper automatically. You never manually export anything.
            </div>
          </div>
          <div className={styles.meetingCard}>
            <div className={styles.meetingBar} />
            <div className={styles.meetingTitle}>Onboarding call: Thorn Studio</div>
            <div className={styles.meetingNote}>Started 18 min ago · Skribby bot joined · transcript processing</div>
            <div className={styles.meetingStatus}>
              <span className={styles.meetingDot} />
              <span className={styles.meetingStatusLabel}>Processing</span>
            </div>
          </div>
        </div>

        <div className={styles.featureGrid}>
          <div className={styles.consoleBox}>
            <div className={[styles.consoleLine, styles.consoleOk].join(" ")}>
              <span>10:51:04</span>
              <span>✓</span>
              <span>Read context: CartSummary.tsx</span>
            </div>
            <div className={[styles.consoleLine, styles.consoleOk].join(" ")}>
              <span>10:51:14</span>
              <span>✓</span>
              <span>Edited: CartSummary.tsx</span>
            </div>
            <div className={[styles.consoleLine, styles.consoleOk].join(" ")}>
              <span>10:51:28</span>
              <span>✓</span>
              <span>Created: useCheckoutValidation.ts</span>
            </div>
            <div className={[styles.consoleLine, styles.consoleActive].join(" ")}>
              <span>10:51:33</span>
              <span className={styles.consoleDot} />
              <span>Editing: pricing.ts, extending response type…</span>
            </div>
          </div>
          <div>
            <div className={styles.featureTitle}>Live execution log: not a black box</div>
            <div className={styles.featureBody}>
              Watch every step the agent takes: checkout, read context, edit file, run tests,
              commit, open PR. A timestamped log in real time. The plan/approve/execute/review
              loop means drift is visible before it ships.
            </div>
          </div>
        </div>
      </div>

      <div className={styles.ctaSection}>
        <div className={styles.ctaTitle}>Ready to run your freelance practice like an OS?</div>
        <div className={styles.ctaBody}>Join the early access list. Solo freelancers only in v1.0.</div>
        <Button
          variant="primary"
          style={{ height: 48, padding: "0 24px", fontSize: 15 }}
          onClick={() => showToast("Thanks. You're on the early access list.")}
        >
          Get early access
        </Button>
        <div className={styles.ctaNote}>No spam. No auto-bidding. No black boxes.</div>
      </div>

      <div className={styles.footer}>
        <span className={styles.footerBrand}>Agentic OS</span>
        <div className={styles.footerLinks}>
          <a href="#" className={styles.footerLink}>
            Privacy
          </a>
          <a href="#" className={styles.footerLink}>
            Terms
          </a>
          <a href="#" className={styles.footerLink}>
            Contact
          </a>
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
