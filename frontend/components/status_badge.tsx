import type { MediaStatus } from "@/types/palate";

type StatusBadgeValue = MediaStatus | "open" | "claimable" | "pending" | "claimed" | "invalid_media_type" | "shelby_upload_failed" | "delete_pending" | "content_unavailable" | "shelby_cleanup_required" | "video_disabled";

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
  delete_pending: "Delete pending",
  content_unavailable: "Content unavailable",
  shelby_cleanup_required: "Shelby cleanup required",
  video_disabled: "Video disabled in MVP",
  open: "Open",
  claimable: "Claimable",
  pending: "Pending",
  claimed: "Claimed"
};

export function StatusBadge({ status }: { status: StatusBadgeValue }) {
  return <span className={`badge status_badge status_${status}`}>{labels[status]}</span>;
}
