import type { MediaFormat } from "@/types/palate";

export function FormatBadge({ format }: { format: MediaFormat }) {
  return <span className="badge format_badge">{format}</span>;
}
