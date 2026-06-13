import type { MediaFormat } from "@/data/mock_data";

export function FormatBadge({ format }: { format: MediaFormat }) {
  return <span className="badge format_badge">{format}</span>;
}
