import type { MediaStatus } from "@/types/palate";

type StatusBadgeValue = MediaStatus | "open" | "claimable" | "pending" | "claimed";

const labels: Record<StatusBadgeValue, string> = {
  idle: "Idle",
  waiting: "Waiting",
  active: "Active",
  settled: "Settled",
  disabled: "Disabled",
  banned: "Banned",
  open: "Open",
  claimable: "Claimable",
  pending: "Pending",
  claimed: "Claimed"
};

export function StatusBadge({ status }: { status: StatusBadgeValue }) {
  return <span className={`badge status_badge status_${status}`}>{labels[status]}</span>;
}
