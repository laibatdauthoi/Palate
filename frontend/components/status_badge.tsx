import type { MediaStatus } from "@/types/palate";

type StatusBadgeValue = MediaStatus | "open" | "claimable" | "pending" | "claimed" | "invalid_media_type" | "shelby_upload_failed";

const labels: Record<StatusBadgeValue, string> = {
  idle: "Idle",
  waiting: "Waiting",
  active: "Active",
  settled: "Settled",
  disabled: "Disabled",
  banned: "Banned",
  pending_registration: "Pending registration",
  registration_failed: "Registration failed",
  invalid_media_type: "Invalid media type",
  shelby_upload_failed: "Shelby upload failed",
  open: "Open",
  claimable: "Claimable",
  pending: "Pending",
  claimed: "Claimed"
};

export function StatusBadge({ status }: { status: StatusBadgeValue }) {
  return <span className={`badge status_badge status_${status}`}>{labels[status]}</span>;
}
