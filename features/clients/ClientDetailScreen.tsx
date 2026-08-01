"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { VerdictBadge } from "@/components/state/VerdictBadge";
import { ConfidenceTag } from "@/components/epistemic/ConfidenceTag";
import { PriceBand } from "@/components/epistemic/PriceBand";
import { StateChip } from "@/components/state/StateChip";
import { getClientById, mockClientContacts } from "@/mock/clients";
import { mockProposals } from "@/mock/proposals";
import { mockMeetings } from "@/mock/meetings";
import { mockTickets } from "@/mock/tickets";
import { formatRelative } from "@/lib/format";
import styles from "./ClientDetailScreen.module.css";

const NOW = new Date("2026-08-02T14:10:00Z");

interface ClientDetailScreenProps {
  clientId: string;
}

export function ClientDetailScreen({ clientId }: ClientDetailScreenProps) {
  const client = getClientById(clientId);
  const [contacts, setContacts] = useState(mockClientContacts.filter((c) => c.client_id === clientId));
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  if (!client) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: "var(--ink-3)" }}>Client not found.</p>
      </div>
    );
  }

  const proposals = mockProposals.filter((p) => p.client_id === clientId);
  const meetings = mockMeetings.filter((m) => m.client_id === clientId && m.status === "ready");
  const tickets = mockTickets.filter((t) => t.client_id === clientId && t.state !== "done" && t.state !== "backlog");

  const wonCount = proposals.filter((p) => p.state === "won").length;
  const resolvedCount = proposals.filter((p) => p.state === "won" || p.state === "lost").length;

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link href="/clients" style={{ color: "var(--ink-3)" }}>
            Clients
          </Link>{" "}
          → {client.name}
        </div>
        <div className={styles.title}>{client.name}</div>
      </div>

      <div className={styles.body}>
        <div className={styles.grid}>
          <div>
            <Card style={{ marginBottom: 20 }}>
              <div className={styles.eyebrow}>Bid verdict · from cache</div>
              <div className={styles.verdictRow}>
                <VerdictBadge verdict={client.verdict ?? "New · Unverified"} />
                <ConfidenceTag
                  tier={client.confidence_tier}
                  missingNote={
                    client.confidence_tier === "low"
                      ? "Missing: reviews and spend history"
                      : client.confidence_tier === "insufficient"
                        ? "Missing: payment verification, hire history, reviews"
                        : undefined
                  }
                />
              </div>
              <div className={styles.factLine}>
                {client.payment_verified ? "Payment verified" : "Payment not verified"}
                {client.spend_visible && " · spend history visible"}
                {client.hires_count > 0 && ` · ${client.hires_count} hires`}
              </div>
              {client.last_analyzed_at ? (
                <div className={styles.cacheNote}>
                  Last analyzed {new Date(client.last_analyzed_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · data
                  unchanged since ·{" "}
                  <button className={styles.refreshLink} onClick={() => showToast("Refreshing analysis…")}>
                    Refresh analysis
                  </button>
                </div>
              ) : (
                <div className={styles.cacheNote}>
                  Not analyzed yet ·{" "}
                  <button className={styles.refreshLink} onClick={() => showToast("Running analysis…")}>
                    Run analysis
                  </button>
                </div>
              )}

              {client.confidence_tier !== "insufficient" && (
                <>
                  <div className={styles.divider} />
                  <div className={styles.eyebrow}>Suggested price band</div>
                  {client.price_band_min && client.price_band_max ? (
                    <>
                      <PriceBand min={client.price_band_min} max={client.price_band_max} low={client.price_band_low_confidence} />
                      <div className={styles.priceNote}>
                        {client.price_band_low_confidence
                          ? "From your rate history only, client data insufficient for a blend."
                          : "Blend of client's historical rates + your rate history."}
                      </div>
                    </>
                  ) : (
                    <div className={styles.priceNote}>Not enough history yet: no estimate shown.</div>
                  )}
                </>
              )}
            </Card>

            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Proposals</div>
              <Link href="/proposals" className={styles.viewAll}>
                View all →
              </Link>
            </div>
            <Card className={styles.tableCard}>
              {proposals.length === 0 ? (
                <div style={{ color: "var(--ink-3)", fontSize: 13, padding: "8px 0" }}>No proposals sent yet.</div>
              ) : (
                <>
                  <div className={styles.tableHead} style={{ gridTemplateColumns: "1.6fr 110px 120px 1fr" }}>
                    <span>Proposal</span>
                    <span>Status</span>
                    <span>Sent</span>
                    <span>Outcome</span>
                  </div>
                  {proposals.map((p) => (
                    <div key={p.id} className={styles.tableRow} style={{ gridTemplateColumns: "1.6fr 110px 120px 1fr" }}>
                      <span style={{ color: "var(--ink)" }}>{p.title}</span>
                      <StateChip state={p.state} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>
                        {p.sent_at ? formatRelative(p.sent_at, NOW) : "–"}
                      </span>
                      <span style={{ fontSize: 13, color: p.outcome_reason ? "var(--ink-2)" : "var(--ink-3)" }}>
                        {p.outcome_reason ?? "–"}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </Card>

            <div className={styles.sectionHead}>
              <div className={styles.sectionTitle}>Meetings</div>
              <Link href="/meetings" className={styles.viewAll}>
                View all →
              </Link>
            </div>
            <Card className={styles.tableCard}>
              {meetings.length === 0 ? (
                <div style={{ color: "var(--ink-3)", fontSize: 13, padding: "8px 0" }}>No processed meetings yet.</div>
              ) : (
                <>
                  <div className={styles.tableHead} style={{ gridTemplateColumns: "1.6fr 120px 100px 1fr" }}>
                    <span>Meeting</span>
                    <span>Date</span>
                    <span>Transcript</span>
                    <span>Tickets</span>
                  </div>
                  {meetings.map((m) => (
                    <div key={m.id} className={styles.tableRow} style={{ gridTemplateColumns: "1.6fr 120px 100px 1fr" }}>
                      <span style={{ color: "var(--ink)" }}>{m.title}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>
                        {new Date(m.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          color: "var(--verified)",
                          background: "var(--verified-tint)",
                          borderRadius: "var(--r-sm)",
                          padding: "3px 8px",
                          width: "fit-content",
                        }}
                      >
                        Ready
                      </span>
                      <Link href={`/meetings/${m.id}/review`} style={{ fontSize: 13 }}>
                        {m.draft_tickets.length} ticket{m.draft_tickets.length === 1 ? "" : "s"}
                      </Link>
                    </div>
                  ))}
                </>
              )}
            </Card>

            <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>
              Active tickets
            </div>
            <Card className={styles.tableCard}>
              {tickets.length === 0 ? (
                <div style={{ color: "var(--ink-3)", fontSize: 13, padding: "8px 0" }}>No active tickets for this client.</div>
              ) : (
                <>
                  <div className={styles.tableHead} style={{ gridTemplateColumns: "1.6fr 200px 1fr" }}>
                    <span>Ticket</span>
                    <span>State</span>
                    <span>Updated</span>
                  </div>
                  {tickets.map((t) => (
                    <div key={t.id} className={styles.tableRow} style={{ gridTemplateColumns: "1.6fr 200px 1fr" }}>
                      <Link href={`/tickets/${t.id}`} style={{ color: "var(--ink)" }}>
                        {t.title}
                      </Link>
                      <StateChip state={t.state} />
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>
                        {formatRelative(t.updated_at, NOW)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </Card>
          </div>

          <div>
            <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>
              Known contacts
            </div>
            <Card className={styles.tableCard} style={{ marginBottom: 16 }}>
              <div className={styles.sidebarNote}>Emails matched for smart auto-join</div>
              {contacts.length === 0 ? (
                <div style={{ color: "var(--ink-3)", fontSize: 13 }}>
                  No known contacts yet. Meetings with this client will surface as suggestions
                  until you add one.
                </div>
              ) : (
                contacts.map((c) => (
                  <div key={c.id} className={styles.contactRow}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.6" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
                    </svg>
                    <div className={styles.contactInfo}>
                      <div className={styles.contactName}>{c.name}</div>
                      <div className={styles.contactEmail}>{c.email}</div>
                    </div>
                    <button
                      className={styles.removeLink}
                      onClick={() => setContacts((cs) => cs.filter((x) => x.id !== c.id))}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
              <button className={styles.addContactLink} onClick={() => showToast("Add contact: coming soon.")}>
                + Add contact
              </button>
            </Card>

            <Card className={styles.tableCard}>
              <div className={styles.statList}>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>First contact</span>
                  <span className={styles.statValue}>
                    {new Date(client.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Total proposals</span>
                  <span className={styles.statValue}>{proposals.length}</span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Won</span>
                  <span className={styles.statValue} style={{ color: resolvedCount > 0 ? "var(--verified)" : "var(--ink-3)" }}>
                    {resolvedCount > 0 ? `${wonCount} (${Math.round((wonCount / resolvedCount) * 100)}%)` : "–"}
                  </span>
                </div>
                <div className={styles.statRow}>
                  <span className={styles.statLabel}>Active tickets</span>
                  <span className={styles.statValue}>{tickets.length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "var(--r-md)",
            fontSize: 14,
            boxShadow: "var(--shadow-pop)",
            zIndex: 20,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
