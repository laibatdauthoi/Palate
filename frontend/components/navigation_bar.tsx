"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { usePalate } from "@/providers/palate_provider";
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
  const [logoAvailable, setLogoAvailable] = useState(true);
  const { claimReadStatus, claimableRewardsSummary } = usePalate();

  return (
    <nav className="navigation_bar desktop_only" aria-label="Main navigation">
      <Link className="brand_lockup" href="/">
        {logoAvailable ? (
          <span className="brand_mark">
            <Image alt="Palate logo" height={32} onError={() => setLogoAvailable(false)} priority src="/brand/palate_logo.png" width={32} />
          </span>
        ) : null}
        <span>Palate</span>
      </Link>
      <div className="nav_links">
        {nav_items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const showClaimReminder = item.href === "/profile" && claimableRewardsSummary.hasClaimableRewards;
          const claimReminderKnown = claimReadStatus !== "loading" || claimableRewardsSummary.hasClaimableRewards;
          return (
            <Link
              className={`nav_link ${active ? "active" : ""} ${showClaimReminder ? "nav_link_attention" : ""}`}
              data-short={item.label.slice(0, 1)}
              href={item.href}
              key={item.href}
            >
              {item.label}
              {showClaimReminder && claimReminderKnown ? <span className="nav_claim_badge">{claimableRewardsSummary.claimableCount}</span> : null}
            </Link>
          );
        })}
      </div>
      <WalletPanel />
    </nav>
  );
}
