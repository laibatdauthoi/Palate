import { useState } from "react";
import type { ActiveMatch, MediaCategory } from "@/types/palate";
import { ActionButton } from "./action_button";
import { useLiveCountdown } from "@/hooks/use_live_countdown";
import { MediaRenderer } from "./media_renderer";
import { ModalShell } from "./modal_shell";
import { logUiPerf, uiPerfNow } from "@/utils/ui_perf";

type MatchCardProps = {
  match: ActiveMatch;
  onSettle?: () => void;
  settleDisabled?: boolean;
};

export function MatchCard({ match, onSettle, settleDisabled }: MatchCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const countdown = useLiveCountdown(Number(match.endTimeSeconds), { endedLabel: "Ended" });
  const isSettleEligible = match.status === "active" && countdown.isEnded;
  const detailStateLabel = isSettleEligible ? "Ready to settle" : `Remaining ${countdown.label}`;
  const categoryLabel = formatCategoryLabel(match.category);
  const endTimeLabel = formatUnixSeconds(match.endTimeSeconds);
  const compactMatchIdLabel = formatCompactMatchId(match.id);

  return (
    <>
      <article className="match_card card_shell card_shell_interactive">
        <div className="match_media_pair">
          <div className={`mini_media card_preview media_preview_${match.mediaA.accent}`}>
            <span className="mini_side_label">Media A</span>
            <MediaRenderer compact media={match.mediaA} variant="match" />
          </div>
          <div className="vs_marker">VS</div>
          <div className={`mini_media card_preview media_preview_${match.mediaB.accent}`}>
            <span className="mini_side_label">Media B</span>
            <MediaRenderer compact media={match.mediaB} variant="match" />
          </div>
        </div>
        <div className="match_card_body card_body">
          <div className="match_card_meta_row card_footer">
            <div className="match_card_footer_meta">
              <span
                className={`match_card_category_tag category_badge category_${match.category}`}
                aria-label={`Category ${categoryLabel}`}
              >
                {categoryLabel}
              </span>
              <span className="match_card_match_id" title={`MATCH #${String(match.id)}`}>
                <span className="match_card_match_id_label">MATCH</span>
                <span className="match_card_match_id_value">{compactMatchIdLabel}</span>
              </span>
            </div>
            <div className="match_card_footer_actions">
              <ActionButton
                className="match_card_detail_button"
                variant="secondary"
                onClick={() => setDetailOpen(true)}
              >
                Detail
              </ActionButton>
              {isSettleEligible && onSettle ? (
                <ActionButton
                  className="match_card_settle_button"
                  disabled={settleDisabled}
                  onClick={() => {
                    const startedAt = uiPerfNow();
                    logUiPerf("settleButtonClick", {
                      matchId: match.id,
                      status: match.status,
                      readyToSettle: isSettleEligible,
                      localStateUpdatedImmediately: false,
                      providerAction: "settleMatch"
                    });
                    onSettle();
                    logUiPerf("settleButtonClick:end", {
                      matchId: match.id,
                      syncDurationMs: Math.round(uiPerfNow() - startedAt)
                    });
                  }}
                >
                  Settle
                </ActionButton>
              ) : (
                <span className="countdown_timer match_card_countdown_slot" aria-label={`Time remaining ${countdown.label}`}>
                  {countdown.label}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>

      <ModalShell
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`Match ${match.id}`}
        subtitle={detailStateLabel}
      >
        <div className="match_detail_modal">
          <div className="match_detail_preview_row">
            <div className={`match_detail_preview mini_media card_preview media_preview_${match.mediaA.accent}`}>
              <span className="mini_side_label">Media A</span>
              <MediaRenderer compact disablePreview media={match.mediaA} variant="match" />
            </div>
            <div className="match_detail_vs">VS</div>
            <div className={`match_detail_preview mini_media card_preview media_preview_${match.mediaB.accent}`}>
              <span className="mini_side_label">Media B</span>
              <MediaRenderer compact disablePreview media={match.mediaB} variant="match" />
            </div>
          </div>
          <dl className="match_detail_grid">
            <div className="match_detail_row">
              <dt>Match ID</dt>
              <dd>{match.id}</dd>
            </div>
            <div className="match_detail_row">
              <dt>Category</dt>
              <dd>{categoryLabel}</dd>
            </div>
            <div className="match_detail_row">
              <dt>Pusher A</dt>
              <dd title={match.pusherA}>{shortenAddress(match.pusherA)}</dd>
            </div>
            <div className="match_detail_row">
              <dt>Pusher B</dt>
              <dd title={match.pusherB}>{shortenAddress(match.pusherB)}</dd>
            </div>
            <div className="match_detail_row">
              <dt>Stake A</dt>
              <dd>{match.pushAmountA} APT</dd>
            </div>
            <div className="match_detail_row">
              <dt>Stake B</dt>
              <dd>{match.pushAmountB} APT</dd>
            </div>
            <div className="match_detail_row">
              <dt>State</dt>
              <dd>{detailStateLabel}</dd>
            </div>
            <div className="match_detail_row">
              <dt>Ends At</dt>
              <dd>{endTimeLabel}</dd>
            </div>
          </dl>
        </div>
      </ModalShell>
    </>
  );
}

function formatCategoryLabel(category: MediaCategory): string {
  return category.toUpperCase();
}

function shortenAddress(address: string): string {
  if (!address) return "Unknown";
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUnixSeconds(value: string | number): string {
  const seconds = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(seconds * 1000));
}

function formatCompactMatchId(matchId: string | number): string {
  const rawId = String(matchId);
  if (rawId.length <= 6) {
    return `#${rawId}`;
  }

  return `#${rawId.slice(0, 3)}...${rawId.slice(-3)}`;
}
