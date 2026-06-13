import { ActionButton } from "@/components/action_button";
import { BuffPanel } from "@/components/buff_panel";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { LoadingState } from "@/components/loading_state";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { mock_matches, mock_stats } from "@/data/mock_data";

export default function BuffPage() {
  return (
    <div className="page_stack">
      <PageHeader
        eyebrow="Buff"
        title="Receive one random match. Choose with conviction."
        copy="Users cannot manually choose a match to Buff. Existing assignments must be completed or skipped before finding another match."
        actions={<ActionButton>Find Match</ActionButton>}
      />

      <BuffPanel match={mock_matches[0]} skipPenalty={mock_stats.skipPenalty} />

      <div className="panel_grid">
        <SectionPanel title="No assigned match">
          <div className="stack">
            <p className="secondary_text">Find Match assigns one active valid match. Manual match selection is not available.</p>
            <ActionButton>Find Match</ActionButton>
          </div>
        </SectionPanel>
        <SectionPanel title="Buff completed">
          <div className="stack">
            <p className="secondary_text">Your Buff is recorded. The result remains pending until the match settles.</p>
            <ActionButton>Find Next Match</ActionButton>
          </div>
        </SectionPanel>
        <EmptyState
          title="No active match available right now."
          copy="Try again later or push your own media into a match."
          actionLabel="Go to Push"
          actionHref="/push"
        />
      </div>

      <div className="wide_two_column">
        <LoadingState label="Finding match" />
        <ErrorState title="No valid match available" copy="Every active match is expired, already Buffed, or not valid for this wallet." />
      </div>
    </div>
  );
}
