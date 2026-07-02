"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePalate } from "@/providers/palate_provider";
import { logUiPerf, startRouteTransition, uiPerfNow } from "@/utils/ui_perf";

const mobile_items = [
  { label: "Home", href: "/" },
  { label: "Media", href: "/my-media" },
  { label: "Profile", href: "/profile" }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { claimReadStatus, claimableRewardsSummary } = usePalate();

  return (
    <nav className="mobile_bottom_nav mobile_only" aria-label="Mobile navigation">
      {mobile_items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const showClaimReminder = item.href === "/profile" && claimableRewardsSummary.hasClaimableRewards;
        const claimReminderKnown = claimReadStatus !== "loading" || claimableRewardsSummary.hasClaimableRewards;
        return (
          <Link
            className={`mobile_nav_link ${active ? "active" : ""} ${showClaimReminder ? "mobile_nav_link_attention" : ""}`}
            href={item.href}
            key={item.href}
            onClick={() => {
              const startedAt = uiPerfNow();
              logUiPerf("mobileNavClick", {
                label: item.label,
                href: item.href,
                routerAction: "link",
                localStateUpdatedImmediately: true
              });
              startRouteTransition("mobile-nav", item.href, "link");
              logUiPerf("mobileNavClick:end", {
                label: item.label,
                syncDurationMs: Math.round(uiPerfNow() - startedAt)
              });
            }}
          >
            <span className="mobile_nav_dot" />
            {item.label}
            {showClaimReminder && claimReminderKnown ? <span className="mobile_nav_badge">{claimableRewardsSummary.claimableCount}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
