"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { VerdictBadge } from "@/components/state/VerdictBadge";
import { formatRelative } from "@/lib/format";
import type { ClientRow, ProposalRow } from "@/types/db";
import styles from "./ClientsListScreen.module.css";

const NOW = new Date("2026-08-02T14:10:00Z");

const TIER_LABEL: Record<string, string> = {
  full: "Full analysis",
  low: "Low confidence",
  insufficient: "Insufficient data",
};

interface ClientsListScreenProps {
  initialClients: ClientRow[];
  proposals: ProposalRow[];
}

export function ClientsListScreen({ initialClients, proposals }: ClientsListScreenProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialClients.filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [search, initialClients]);

  return (
    <div>
      <PageHeader title="Clients" />

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.body}>
        <div className={styles.table}>
          <div className={styles.headRow}>
            <span>Client</span>
            <span>Verdict</span>
            <span>Confidence</span>
            <span>Won / lost</span>
            <span>Last analyzed</span>
          </div>

          {visible.length === 0 ? (
            <div className={styles.empty}>No clients yet. They&rsquo;re created automatically the first time you analyze a job or log a meeting.</div>
          ) : (
            visible.map((c) => {
              const won = proposals.filter((p) => p.client_id === c.id && p.state === "won").length;
              const lost = proposals.filter((p) => p.client_id === c.id && p.state === "lost").length;
              return (
                <div key={c.id} className={styles.row} onClick={() => router.push(`/clients/${c.id}`)}>
                  <span className={styles.name}>{c.name}</span>
                  <span>
                    <VerdictBadge verdict={c.verdict ?? "New · Unverified"} />
                  </span>
                  <span className={styles.confidence}>{TIER_LABEL[c.confidence_tier]}</span>
                  <span className={styles.record}>
                    {won > 0 || lost > 0 ? `${won} won, ${lost} lost` : "No resolved proposals"}
                  </span>
                  <span className={styles.analyzed}>
                    {c.last_analyzed_at ? formatRelative(c.last_analyzed_at, NOW) : "Never"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
