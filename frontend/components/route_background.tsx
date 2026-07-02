"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function getRouteClass(pathname: string) {
  if (pathname === "/") return "route_home";
  if (pathname.startsWith("/my-media/upload")) return "route_upload";
  if (pathname.startsWith("/my-media")) return "route_media";
  if (pathname.startsWith("/profile")) return "route_profile";
  return "route_home";
}

export function RouteBackground() {
  const pathname = usePathname();
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    function syncPausedState() {
      setPaused(document.visibilityState !== "visible");
    }

    syncPausedState();
    document.addEventListener("visibilitychange", syncPausedState);
    return () => document.removeEventListener("visibilitychange", syncPausedState);
  }, []);

  return (
    <div className={`route_background ${getRouteClass(pathname)}`} aria-hidden="true" data-paused={paused ? "true" : "false"}>
      <span className="route_fx route_fx_one" />
      <span className="route_fx route_fx_two" />
      <span className="route_fx route_fx_three" />
      <span className="route_fx route_fx_four" />
      <span className="route_fx route_fx_five" />
      <span className="route_fx route_fx_six" />
    </div>
  );
}
