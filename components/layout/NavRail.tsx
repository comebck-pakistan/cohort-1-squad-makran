"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "./NotificationBell";
import type { NotificationRow } from "@/types/db";
import styles from "./NavRail.module.css";

const NAV = [
  { href: "/home", label: "Home" },
  { href: "/meetings", label: "Meetings" },
  { href: "/tickets", label: "Tickets" },
  { href: "/proposals", label: "Proposals" },
  { href: "/insights", label: "Insights" },
  { href: "/clients", label: "Clients" },
  { href: "/settings", label: "Settings" },
] as const;

interface NavRailProps {
  notifications: NotificationRow[];
}

/** Fixed 240px left nav rail (design-system.md §7, web command center). */
export function NavRail({ notifications }: NavRailProps) {
  const pathname = usePathname();
  return (
    <nav className={styles.rail}>
      <div className={styles.brandRow}>
        <div className={styles.brand}>Solvo</div>
        <NotificationBell initialNotifications={notifications} />
      </div>
      {NAV.map((n) => {
        const active = pathname?.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={[styles.item, active && styles.active].filter(Boolean).join(" ")}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
