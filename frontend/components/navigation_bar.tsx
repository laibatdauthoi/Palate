"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { House, Images, UserRound } from "lucide-react";
import { usePalate } from "@/providers/palate_provider";
import { logUiPerf, startRouteTransition, uiPerfNow } from "@/utils/ui_perf";
import { WalletPanel } from "./wallet_panel";

const nav_items = [
  { label: "Home", href: "/", icon: House },
  { label: "My Media", href: "/my-media", icon: Images },
  { label: "Profile", href: "/profile", icon: UserRound }
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
          const Icon = item.icon;
          return (
            <Link
              className={`nav_link ${active ? "active" : ""} ${showClaimReminder ? "nav_link_attention" : ""}`}
              data-short={item.label.slice(0, 1)}
              href={item.href}
              key={item.href}
              onClick={() => {
                const startedAt = uiPerfNow();
                logUiPerf("mainNavClick", {
                  label: item.label,
                  href: item.href,
                  routerAction: "link",
                  localStateUpdatedImmediately: true
                });
                startRouteTransition("desktop-nav", item.href, "link");
                logUiPerf("mainNavClick:end", {
                  label: item.label,
                  syncDurationMs: Math.round(uiPerfNow() - startedAt)
                });
              }}
            >
              <span className="nav_link_main">
                <span aria-hidden="true" className="nav_link_icon">
                  <Icon className="nav_link_icon_svg" strokeWidth={2.4} />
                </span>
                <span className="nav_link_label">{item.label}</span>
              </span>
              {showClaimReminder && claimReminderKnown ? <span className="nav_claim_badge">{claimableRewardsSummary.claimableCount}</span> : null}
            </Link>
          );
        })}
      </div>
      <WalletPanel />
    </nav>
  );
}
