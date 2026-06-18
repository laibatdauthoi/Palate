import { app_config } from "@/config/app_config";

type PendingRouteTransition = {
  source: string;
  target: string;
  method: "link" | "router.push" | "router.replace";
  startedAt: number;
};

let pendingRouteTransition: PendingRouteTransition | null = null;

export function uiPerfNow() {
  return typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

export function logUiPerf(event: string, payload: Record<string, unknown> = {}) {
  if (!app_config.debugUiPerf) {
    return;
  }

  console.info("[Palate UI perf]", {
    event,
    timestampMs: Math.round(uiPerfNow()),
    ...payload
  });
}

export function startUiPerf(event: string, payload: Record<string, unknown> = {}) {
  const startedAt = uiPerfNow();
  logUiPerf(`${event}:start`, payload);

  return (status: "success" | "error" | "end", extra: Record<string, unknown> = {}) => {
    logUiPerf(`${event}:${status}`, {
      durationMs: Math.round(uiPerfNow() - startedAt),
      ...payload,
      ...extra
    });
  };
}

export function startRouteTransition(source: string, target: string, method: PendingRouteTransition["method"]) {
  pendingRouteTransition = {
    source,
    target,
    method,
    startedAt: uiPerfNow()
  };

  logUiPerf("routeTransition:start", {
    source,
    target,
    method
  });
}

export function completeRouteTransition(pathname: string) {
  if (!pendingRouteTransition) {
    logUiPerf("routeTransition:pathname", {
      pathname,
      pending: false
    });
    return;
  }

  logUiPerf("routeTransition:pathname", {
    source: pendingRouteTransition.source,
    target: pendingRouteTransition.target,
    method: pendingRouteTransition.method,
    pathname,
    durationMs: Math.round(uiPerfNow() - pendingRouteTransition.startedAt),
    matchedTarget: pendingRouteTransition.target === pathname || pathname.startsWith(`${pendingRouteTransition.target}?`)
  });

  pendingRouteTransition = null;
}

export function logPageMount(pageName: string) {
  logUiPerf("pageMount", { page: pageName });
}
