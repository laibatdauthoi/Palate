import type { MediaStatus } from "@/data/mock_data";

export function StatusBadge({ status }: { status: MediaStatus | "Active" | "Settled" | "Open" | "Claimable" | "Pending" }) {
  return <span className={`badge status_badge status_${status.toLowerCase()}`}>{status}</span>;
}
