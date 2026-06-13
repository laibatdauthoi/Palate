"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const mobile_items = [
  { label: "Home", href: "/" },
  { label: "Buff", href: "/buff" },
  { label: "Media", href: "/my-media" },
  { label: "Push", href: "/push" },
  { label: "Profile", href: "/profile" }
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile_bottom_nav mobile_only" aria-label="Mobile navigation">
      {mobile_items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link className={`mobile_nav_link ${active ? "active" : ""}`} href={item.href} key={item.href}>
            <span className="mobile_nav_dot" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
