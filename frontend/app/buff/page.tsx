"use client";

import { useEffect, useMemo, useState } from "react";
import { BuffWorkflow } from "@/components/buff_workflow";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { FilterBar } from "@/components/filter_bar";
import { LoadingState } from "@/components/loading_state";
import { MatchCard } from "@/components/match_card";
import { useCountdownNow, getLiveCountdownState } from "@/hooks/use_live_countdown";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { canonicalizeAptosAddress } from "@/services/aptos_service";
import type { ActiveMatch, UserBuffRecord } from "@/types/palate";
import { logPageMount } from "@/utils/ui_perf";
type MyBuffFilter = "all" | "pending" | "ready";

export default function BuffPage() {
  const {
    activeMatches,
    feedback,
    processingAction,
    publicGameReadStatus,
    readLifecycle,
    settleMatch,
    userBuffReadStatus,
    userBuffRecords,
    walletReadCache
  } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const [myBuffFilter, setMyBuffFilter] = useState<MyBuffFilter>("all");
  const nowMs = useCountdownNow();
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const buffRecordsOwnedByCurrentWallet = walletReadCache.userBuffRecords.ownerAddress === normalizedWalletAddress;
  const buffRecordsHaveCurrentWalletData = buffRecordsOwnedByCurrentWallet && walletReadCache.userBuffRecords.lastSuccessfulReadAt !== null;
  const walletReady = walletStatus === "connected";
  const settleFeedback = feedback?.scope === "settle" ? feedback : null;
  const activeMatchesById = useMemo(() => new Map(activeMatches.map((match) => [normalizeMatchId(match.id), match])), [activeMatches]);
  const myBuffEntries = useMemo(() => {
    return userBuffRecords
      .filter((record) => !record.claimed)
      .map((record) => {
        const normalizedMatchId = normalizeMatchId(record.matchId);
        const match = activeMatchesById.get(normalizedMatchId) ?? null;
        const status = classifyBuffEntry(record, match, nowMs);

        return {
          matchId: normalizedMatchId,
          buffRecord: record,
          match,
          status
        };
      });
  }, [activeMatchesById, nowMs, userBuffRecords]);
  const pendingBuffEntries = useMemo(
    () => myBuffEntries.filter((entry) => entry.status === "pending_result"),
    [myBuffEntries]
  );
  const readyToSettleBuffEntries = useMemo(
    () => myBuffEntries.filter((entry) => entry.status === "ready_to_settle"),
    [myBuffEntries]
  );
  const myBuffCounts = useMemo(() => {
    const pending = pendingBuffEntries.length;
    const ready = readyToSettleBuffEntries.length;

    return {
      all: pending + ready,
      pending,
      ready
    };
  }, [pendingBuffEntries.length, readyToSettleBuffEntries.length]);
  const filteredMyBuffEntries = useMemo(() => {
    if (myBuffFilter === "pending") {
      return pendingBuffEntries;
    }

    if (myBuffFilter === "ready") {
      return readyToSettleBuffEntries;
    }

    return myBuffEntries.filter((entry) => entry.status === "pending_result" || entry.status === "ready_to_settle");
  }, [myBuffEntries, myBuffFilter, pendingBuffEntries, readyToSettleBuffEntries]);
  const isUserBuffsResolved = !walletReady || (buffRecordsOwnedByCurrentWallet && userBuffReadStatus !== "idle" && userBuffReadStatus !== "loading");
  const isUserBuffsUnresolved = walletReady && !isUserBuffsResolved;
  const isMyBuffPublicStateUnresolved = !readLifecycle.hasLoadedPublicGameState && (publicGameReadStatus === "idle" || publicGameReadStatus === "loading");
  const isMyBuffsDataUnresolved = isUserBuffsUnresolved || isMyBuffPublicStateUnresolved;
  const isMyBuffsLoading = isMyBuffsDataUnresolved;
  const isMyBuffsError = walletReady
    && !isMyBuffsLoading
    && (userBuffReadStatus === "error" || publicGameReadStatus === "error")
    && !buffRecordsHaveCurrentWalletData
    && myBuffEntries.length === 0;
  const hasMyBuffRecords = filteredMyBuffEntries.length > 0;
  const canShowMyBuffsEmpty = !isMyBuffsLoading && !isMyBuffsError && !hasMyBuffRecords;
  const myBuffFilterItems = useMemo(() => ([
    { key: "all" as const, label: "All", count: myBuffCounts.all },
    { key: "pending" as const, label: "Pending Result", count: myBuffCounts.pending },
    { key: "ready" as const, label: "Ready to Settle", count: myBuffCounts.ready }
  ]), [myBuffCounts]);
  useEffect(() => {
    logPageMount("Buff");
  }, []);

  return (
    <div className="page_stack page_buff">
      <div className="buff_page_label page_label_lifted">
        <span className="eyebrow">My Buffs</span>
      </div>

      <BuffWorkflow sourceContext="buff" />

      <div className="buff_my_buffs_stack">
        {settleFeedback ? <p className={`feedback_text feedback_${settleFeedback.type}`}>{settleFeedback.message}</p> : null}
        <FilterBar
          activeKey={myBuffFilter}
          ariaLabel="My Buffs filters"
          items={myBuffFilterItems}
          onChange={setMyBuffFilter}
        />
        {!walletReady ? (
          <EmptyState
            variant="section"
            title="Connect wallet to view My Buffs."
            copy="Your Buff records and settlement-ready matches only appear for the connected wallet."
          />
        ) : isMyBuffsError ? (
          <ErrorState
            variant="section"
            title="My Buffs unavailable"
            copy="Buff records are temporarily unavailable while the chain read is retried."
          />
        ) : isMyBuffsLoading ? (
          <LoadingState
            variant="section"
            label="Loading My Buffs"
            copy="Checking your Buff records."
          />
        ) : hasMyBuffRecords ? (
          <div className="buff_results_stack">
            {filteredMyBuffEntries.some((entry) => entry.match) ? (
              <div className="compact_card_grid compact_card_grid_matches buff_matches_grid">
                {filteredMyBuffEntries
                  .filter((entry) => entry.match)
                  .map((entry) => (
                    <MatchCard
                      key={`match-${entry.buffRecord.matchId}-${entry.buffRecord.side}`}
                      match={entry.match!}
                      settleDisabled={!walletReady || processingAction === "settleMatch" || entry.status !== "ready_to_settle"}
                      onSettle={entry.status === "ready_to_settle" ? () => settleMatch(entry.match!.id) : undefined}
                    />
                  ))}
              </div>
            ) : null}
          </div>
        ) : canShowMyBuffsEmpty ? (
          <EmptyState
            variant="section"
            title={
              myBuffFilter === "pending"
                ? "No pending results"
                : myBuffFilter === "ready"
                  ? "No matches ready to settle"
                  : "No Buffs yet"
            }
            copy={
              myBuffFilter === "pending"
                ? "Matches you have Buffed will stay here until the result is ready."
                : myBuffFilter === "ready"
                  ? "Matches become ready to settle after the end time passes."
              : "Find a match and Buff one side to start tracking it here."
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function normalizeMatchId(matchId: number | string) {
  return String(matchId);
}

function normalizeAddress(address: string | null | undefined) {
  return canonicalizeAptosAddress(address);
}

function isMatchEnded(match: ActiveMatch, nowMs: number) {
  return getLiveCountdownState(Number(match.endTimeSeconds), nowMs, { endedLabel: "Ended" }).isEnded;
}

function isMatchSettled(match: ActiveMatch) {
  return match.status === "settled";
}

function classifyBuffEntry(record: UserBuffRecord, match: ActiveMatch | null, nowMs: number) {
  if (record.claimed || match === null || isMatchSettled(match)) {
    return "claimable_or_settled_excluded" as const;
  }

  if (isMatchEnded(match, nowMs)) {
    return "ready_to_settle" as const;
  }

  return "pending_result" as const;
}
