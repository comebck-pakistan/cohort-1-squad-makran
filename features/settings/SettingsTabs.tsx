"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SettingsTabs.module.css";

const TABS = [
  { href: "/settings", label: "Rate history" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/settings/notifications", label: "Notifications" },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Settings</div>
      <div className={styles.tabRow}>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={[styles.tab, pathname === t.href && styles.tabActive].filter(Boolean).join(" ")}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
