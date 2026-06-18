"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { completeRouteTransition } from "@/utils/ui_perf";

export function RoutePerfTracker() {
  const pathname = usePathname();

  useEffect(() => {
    completeRouteTransition(pathname);
  }, [pathname]);

  return null;
}
