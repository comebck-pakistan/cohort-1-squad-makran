import type { ReactNode } from "react";
import styles from "~styles/popup.module.css";

export type TabId = "client" | "proposal" | "insights";

const TABS: { id: TabId; label: string }[] = [
  { id: "client", label: "Client" },
  { id: "proposal", label: "Proposal" },
  { id: "insights", label: "Insights" },
];

interface PopupShellProps {
  jobTitle: string;
  cacheLabel?: string;
  activeTab: TabId | null;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
}

export function PopupShell({ jobTitle, cacheLabel, activeTab, onTabChange, children }: PopupShellProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.headerTop}>
        <div className={styles.logo}>Agentic OS</div>
        <div className={styles.jobTitle} style={cacheLabel ? undefined : { color: "var(--ink-4)" }}>
          {jobTitle}
        </div>
        <div className={styles.cacheChip} style={cacheLabel ? undefined : { color: "var(--ink-4)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 3v6h-6" />
          </svg>
          {cacheLabel && <span>{cacheLabel}</span>}
        </div>
      </div>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={[styles.tab, activeTab === tab.id ? styles.tabActive : ""].join(" ")}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
