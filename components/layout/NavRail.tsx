"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

/** Fixed 240px left nav rail (design-system.md §7, web command center). */
export function NavRail() {
  const pathname = usePathname();
  return (
    <nav className={styles.rail}>
      <div className={styles.brand}>Agentic OS</div>
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
