import { EmptyState } from "@/components/empty_state";
import { PageHeader } from "@/components/page_header";

export default function LeaderboardPage() {
  return (
    <div className="page_stack">
      <PageHeader eyebrow="Leaderboard" title="Leaderboard" copy="A ranking surface is reserved here for a later pass." />
      <EmptyState title="Leaderboard coming soon" copy="This placeholder route keeps navigation ready without adding the leaderboard UI yet." variant="section" />
    </div>
  );
}
