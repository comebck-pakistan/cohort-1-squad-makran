"use client";

import { useState } from "react";
import Link from "next/link";
import { VerdictBadge } from "@/components/state/VerdictBadge";
import { ConfidenceTag } from "@/components/epistemic/ConfidenceTag";
import { PriceBand } from "@/components/epistemic/PriceBand";
import { StateChip } from "@/components/state/StateChip";
import { formatDateTime } from "@/lib/format";
import { saveCommunicationNotes } from "@/lib/actions/clients";
import type { MeetingRow, ClientRow, ClientContactRow, ProposalRow } from "@/types/db";
import styles from "./PreMeetingBriefingScreen.module.css";

interface PreMeetingBriefingScreenProps {
  meeting: MeetingRow | null;
  client: ClientRow | null;
  contacts: ClientContactRow[];
  pastProposals: ProposalRow[];
}

export function PreMeetingBriefingScreen({ meeting, client, contacts, pastProposals }: PreMeetingBriefingScreenProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(client?.communication_notes ?? "");
  const [notes, setNotes] = useState(client?.communication_notes ?? "");
  const [saving, setSaving] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function saveNotes() {
    if (!client) return;
    setSaving(true);
    try {
      await saveCommunicationNotes(client.id, notesDraft);
      setNotes(notesDraft.trim());
      setEditingNotes(false);
      showToast("Notes saved.");
    } catch {
      showToast("Could not save notes. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!meeting) {
    return (
      <div className={styles.page}>
        <p style={{ color: "var(--ink-3)" }}>Meeting not found.</p>
      </div>
    );
  }

  if (!meeting.known_client || !client) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.pageTitle}>Pre-meeting prep briefing</div>
          <div style={{ color: "var(--ink-3)", fontSize: 14, maxWidth: 480, lineHeight: 1.6 }}>
            No briefing for &ldquo;{meeting.title}&rdquo;. Pre-meeting briefings only fire for
            known clients (contacts matched to an existing client record). This meeting&rsquo;s
            guest doesn&rsquo;t match one yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pageTitle}>Pre-meeting prep briefing</div>

        <div className={styles.grid}>
          <div>
            <div className={styles.colLabel}>In-app notification</div>
            <div className={styles.appCard}>
              <div className={styles.appBar} />
              <div className={styles.appHead}>
                <span className={styles.appEyebrow}>● Pre-meeting briefing · from cache · 15 min before</span>
                <span className={styles.appTime}>{formatDateTime(meeting.starts_at)}</span>
              </div>

              <div className={styles.meetingTitle}>{meeting.title}</div>
              <div className={styles.meetingMeta}>
                {formatDateTime(meeting.starts_at)} · Google Meet
                {contacts.length > 0 && ` · ${contacts.map((c) => c.name).join(", ")}`}
              </div>

              <div className={styles.block}>
                <div className={styles.blockEyebrow}>Bid verdict</div>
                <div className={styles.verdictRow}>
                  <VerdictBadge verdict={client.verdict ?? "New · Unverified"} />
                  <ConfidenceTag tier={client.confidence_tier} />
                  <span className={styles.cachedNote}>
                    cached {client.last_analyzed_at && new Date(client.last_analyzed_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                </div>
                <div className={styles.factLine}>
                  {client.payment_verified ? "Payment verified" : "Payment not verified"}
                  {client.spend_visible && ` · $${(24000).toLocaleString()} spend`}
                  {client.hires_count > 0 && ` · ${client.hires_count} hires`}
                </div>
              </div>

              <div className={styles.blockNoBorder}>
                <div className={styles.blockEyebrow}>Suggested price band</div>
                {client.price_band_min && client.price_band_max ? (
                  <>
                    <PriceBand min={client.price_band_min} max={client.price_band_max} low={client.price_band_low_confidence} />
                    <div className={styles.priceNote}>From cache · blend of client rates + your rate history</div>
                  </>
                ) : (
                  <div className={styles.priceNote}>Not enough history yet: no estimate shown.</div>
                )}
              </div>

              <div className={styles.blockNoBorder}>
                <div className={styles.blockEyebrow}>Communication style</div>
                {editingNotes ? (
                  <>
                    <textarea
                      className={styles.commStyleInput}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="e.g. Prefers async updates over calls, responds fastest on Slack"
                      autoFocus
                    />
                    <div className={styles.commStyleActions}>
                      <button
                        className={styles.commStyleCancel}
                        onClick={() => {
                          setNotesDraft(notes);
                          setEditingNotes(false);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button className={styles.commStyleSave} onClick={saveNotes} disabled={saving}>
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </>
                ) : notes ? (
                  <div className={styles.commStyle}>
                    {notes}
                    <button className={styles.commStyleEdit} onClick={() => setEditingNotes(true)}>
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className={styles.priceNote}>
                    No notes yet.{" "}
                    <button className={styles.commStyleEdit} onClick={() => setEditingNotes(true)}>
                      Add what you know about how they like to communicate.
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.blockNoBorder}>
                <div className={styles.blockEyebrow}>Past proposals</div>
                {pastProposals.length === 0 ? (
                  <div style={{ color: "var(--ink-3)", fontSize: 13 }}>No past proposals with this client yet.</div>
                ) : (
                  <div className={styles.pastList}>
                    {pastProposals.map((p) => (
                      <div key={p.id} className={styles.pastRow}>
                        <span className={styles.pastTitle}>{p.title}</span>
                        <StateChip state={p.state} />
                        <span className={styles.pastReason}>
                          {p.outcome_reason ?? (p.state === "sent" ? "Awaiting response" : "–")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.footer}>
                <Link href={`/clients/${client.id}`} className={styles.footerLink}>
                  View full client profile →
                </Link>
                <button className={styles.footerDismiss} onClick={() => showToast("Briefing dismissed.")}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className={styles.colLabel}>Email (Nodemailer / Gmail SMTP)</div>
            <div className={styles.emailSubjectNote}>Subject: &ldquo;Briefing: {meeting.title} · {formatDateTime(meeting.starts_at)}&rdquo;</div>
            <div className={styles.emailShell}>
              <div className={styles.emailHeader}>
                <span className={styles.emailBrand}>Solvo</span>
              </div>
              <div className={styles.emailAccent} />
              <div className={styles.emailBody}>
                <div className={styles.emailTitle}>{meeting.title}</div>
                <div className={styles.emailMeta}>{formatDateTime(meeting.starts_at)} · Google Meet</div>

                <div className={styles.emailBlock}>
                  <div className={styles.emailBlockEyebrow}>Bid verdict</div>
                  <div className={styles.emailVerdictLine}>
                    {client.verdict ?? "New · Unverified"} ·{" "}
                    {client.confidence_tier === "full" ? "Full analysis" : client.confidence_tier === "low" ? "Low confidence" : "Insufficient data"}
                  </div>
                  <div className={styles.emailFact}>
                    {client.payment_verified ? "Payment verified" : "Payment not verified"}
                    {client.hires_count > 0 && ` · ${client.hires_count} hires`}
                  </div>
                </div>

                <div className={styles.emailBlockNoBorder}>
                  <div className={styles.emailBlockEyebrow}>Suggested price band</div>
                  <div className={styles.emailPriceLine}>
                    {client.price_band_min && client.price_band_max
                      ? `Suggested range: ${client.price_band_min}–${client.price_band_max}`
                      : "Not enough history yet: no estimate shown."}
                  </div>
                </div>

                <div className={styles.emailBlockNoBorder}>
                  <div className={styles.emailBlockEyebrow}>Communication style</div>
                  <div className={styles.emailFact}>{notes || "No notes yet."}</div>
                </div>

                <div className={styles.emailBlockNoBorder}>
                  <div className={styles.emailBlockEyebrow}>Past proposals</div>
                  <div className={styles.emailPastList}>
                    {pastProposals.map((p) => (
                      <div key={p.id}>
                        {p.title} ·{" "}
                        <span className={p.state === "won" ? styles.emailWon : styles.emailSent}>
                          {p.state.toUpperCase()}
                        </span>{" "}
                        · {p.outcome_reason ?? "Awaiting response"}
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.emailBlock}>
                  <Link href={`/clients/${client.id}`} style={{ fontSize: 13 }}>
                    View full client profile →
                  </Link>
                </div>
              </div>
              <div className={styles.emailFooter}>
                <span className={styles.emailFooterText}>
                  Solvo · Sent via Nodemailer · Manage notifications in Settings
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
