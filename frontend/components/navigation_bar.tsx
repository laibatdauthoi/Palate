"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletPanel } from "./wallet_panel";

const nav_items = [
  { label: "Home", href: "/" },
  { label: "Buff", href: "/buff" },
  { label: "My Media", href: "/my-media" },
  { label: "Push", href: "/push" },
  { label: "Profile", href: "/profile" }
];

export function NavigationBar() {
  const pathname = usePathname();

  return (
    <nav className="navigation_bar desktop_only" aria-label="Main navigation">
      <Link className="brand_lockup" href="/">
        <span className="brand_mark">P</span>
        <span>Palate</span>
      </Link>
      <div className="nav_links">
        {nav_items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link className={`nav_link ${active ? "active" : ""}`} data-short={item.label.slice(0, 1)} href={item.href} key={item.href}>
              {item.label}
            </Link>
          );
        })}
      </div>
      <WalletPanel />
    </nav>
  );
}
