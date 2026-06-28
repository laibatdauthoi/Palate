"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/action_button";
import { AmountInput } from "@/components/amount_input";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { ClaimCard } from "@/components/claim_card";
import { FilterBar } from "@/components/filter_bar";
import { LoadingState } from "@/components/loading_state";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { formatOctasToApt } from "@/services/aptos_service";
import type { PalateActivityFilter, PalateActivityTransaction } from "@/types/palate";
import { logPageMount, logUiPerf, startUiPerf, uiPerfNow } from "@/utils/ui_perf";

type ProfileTab = "Stats" | "Claims" | "Activity";

function isLoadingValue(value: string) {
  return value === "Loading";
}

function isUnavailableValue(value: string) {
  return value === "Unavailable";
}

function shortenAddress(address: string | null | undefined) {
  if (!address) return "Not connected";
  if (address.length <= 16) return address;
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
}

function normalizeAddress(address: string | null | undefined) {
  return address?.trim().toLowerCase() ?? null;
}

function parseProfileTab(value: string | null): ProfileTab {
  if (value === "Claims" || value === "Activity" || value === "Stats") {
    return value;
  }

  return "Stats";
}

function renderStatValue(value: string) {
  if (isLoadingValue(value)) {
    return <span className="stat_value_hint">Loading...</span>;
  }

  if (isUnavailableValue(value)) {
    return <span className="stat_value_hint stat_value_unavailable">Unavailable</span>;
  }

  return <strong>{value}</strong>;
}

function formatActivityMeta(transaction: PalateActivityTransaction) {
  const parts: string[] = [transaction.status, transaction.shortHash];
  if (transaction.decodedId) {
    parts.push(`#${transaction.decodedId}`);
  }
  if (transaction.amount) {
    parts.push(transaction.amount);
  }
  if (transaction.timestamp) {
    parts.push(transaction.timestamp);
  }
  return parts;
}

const activity_filters: Exclude<PalateActivityFilter, "Admin">[] = ["All", "Media", "Push", "Buff", "Match", "Claims", "Balance", "Failed"];

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="page_stack page_profile" />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const {
    activityReadStatus,
    activityTransactions,
    balance,
    claimReadStatus,
    claimRecords,
    claimReward,
    claimableRewardsSummary,
    depositBalance,
    feedback,
    processingAction,
    refreshProfileActivity,
    userSummary,
    userSummaryReadStatus,
    walletReadCache,
    withdrawBalance
  } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ProfileTab>(parseProfileTab(searchParams.get("tab")));
  const [activityFilter, setActivityFilter] = useState<Exclude<PalateActivityFilter, "Admin">>("All");
  const [balanceAmount, setBalanceAmount] = useState("1.000");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTouched, setHistoryTouched] = useState(false);
  const [activityRefreshing, setActivityRefreshing] = useState(false);
  const [activityVisibleCount, setActivityVisibleCount] = useState(20);
  const balanceBusy = processingAction === "deposit" || processingAction === "withdraw";
  const walletReady = walletStatus === "connected" && Boolean(walletAddress);
  const claimBusy = processingAction === "claimReward";
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const summaryOwnedByCurrentWallet = walletReadCache.userSummary.ownerAddress === normalizedWalletAddress;
  const summaryHasCurrentWalletData = summaryOwnedByCurrentWallet && walletReadCache.userSummary.lastSuccessfulReadAt !== null;
  const claimsOwnedByCurrentWallet = walletReadCache.claimRecords.ownerAddress === normalizedWalletAddress;
  const claimsHaveCurrentWalletData = claimsOwnedByCurrentWallet && walletReadCache.claimRecords.lastSuccessfulReadAt !== null;
  const activityOwnedByCurrentWallet = walletReadCache.userActivity.ownerAddress === normalizedWalletAddress;
  const activityHasCurrentWalletData = activityOwnedByCurrentWallet && walletReadCache.userActivity.lastSuccessfulReadAt !== null;
  const balanceOwnedByCurrentWallet = walletReadCache.palateBalance.ownerAddress === normalizedWalletAddress;

  const profile_stats = [
    { label: "Push count", value: userSummary.pushCount },
    { label: "Push wins", value: userSummary.pushWins },
    { label: "Push losses", value: userSummary.pushLosses },
    { label: "Push win rate", value: userSummary.pushWinRate },
    { label: "Push profit", value: userSummary.pushProfit },
    { label: "Buff count", value: userSummary.buffCount },
    { label: "Buff wins", value: userSummary.buffWins },
    { label: "Buff losses", value: userSummary.buffLosses },
    { label: "Buff win rate", value: userSummary.buffWinRate },
    { label: "Buff profit", value: userSummary.buffProfit },
    { label: "Total pushed", value: userSummary.totalPushed },
    { label: "Total buffed", value: userSummary.totalBuffed }
  ];

  const claimableClaims = useMemo(
    () => claimRecords.filter((claim) => claim.settled && !claim.claimed && claim.claimable && BigInt(claim.claimableAmountOctas) > BigInt(0)),
    [claimRecords]
  );
  const claimedClaims = useMemo(() => claimRecords.filter((claim) => claim.claimed), [claimRecords]);
  const totalClaimableAmount = useMemo(() => formatOctasToApt(claimableRewardsSummary.claimableTotalOctas), [claimableRewardsSummary.claimableTotalOctas]);
  const visibleClaimableRewardsSummary = claimsOwnedByCurrentWallet
    ? claimableRewardsSummary
    : {
        claimableCount: 0,
        claimableTotalOctas: "0",
        hasClaimableRewards: false
      };

  const claimReadMessage =
    !claimsOwnedByCurrentWallet
      ? "Loading claims."
      : claimReadStatus === "loading"
      ? "Loading claims."
      : claimReadStatus === "error"
        ? claimRecords.length > 0
          ? "Claims temporarily unavailable. Using last read."
          : "Claims temporarily unavailable."
        : null;

  const statsReadMessage =
    !summaryOwnedByCurrentWallet
      ? "Loading stats."
      : userSummaryReadStatus === "loading"
      ? "Loading stats."
      : userSummaryReadStatus === "error"
        ? Object.values(userSummary).some((value) => value !== "Unavailable" && value !== "Loading" && value !== "" && value !== walletAddress)
          ? "Stats temporarily unavailable. Using last read."
          : "Stats temporarily unavailable."
        : null;

  const summaryClaimableValue =
    !claimsOwnedByCurrentWallet
      ? "Loading"
      : claimReadStatus === "loading" && claimRecords.length === 0
      ? "Loading"
      : claimReadStatus === "error" && claimRecords.length === 0
        ? "Unavailable"
        : totalClaimableAmount;

  const balanceFeedback = feedback?.scope === "wallet" ? feedback : null;
  const claimFeedback = feedback?.scope === "claim" ? feedback : null;
  const activityFeedback = feedback?.scope === "profile" ? feedback : null;

  const filteredActivityTransactions = useMemo(
    () =>
      activityTransactions.filter((transaction) => {
        if (activityFilter === "All") return true;
        if (activityFilter === "Failed") return transaction.status === "Failed";
        return transaction.filter === activityFilter;
      }),
    [activityFilter, activityTransactions]
  );
  const visibleActivityTransactions = useMemo(
    () => filteredActivityTransactions.slice(0, activityVisibleCount),
    [activityVisibleCount, filteredActivityTransactions]
  );
  const canLoadMoreActivity = visibleActivityTransactions.length < filteredActivityTransactions.length;

  const activityReadMessage =
    !activityOwnedByCurrentWallet
      ? "Loading activity."
      : activityReadStatus === "loading" || activityRefreshing
      ? "Loading activity."
      : activityReadStatus === "error"
        ? activityTransactions.length > 0
          ? "Activity temporarily unavailable. Using last read."
          : "Activity temporarily unavailable."
        : null;

  useEffect(() => {
    logPageMount("Profile");
  }, []);

  useEffect(() => {
    setTab(parseProfileTab(searchParams.get("tab")));
  }, [searchParams]);

  useEffect(() => {
    if (tab !== "Claims") {
      setHistoryTouched(false);
      return;
    }

    if (!historyTouched) {
      setHistoryOpen(claimableClaims.length === 0);
    }
  }, [claimableClaims.length, historyTouched, tab]);

  useEffect(() => {
    setActivityVisibleCount(20);
  }, [activityFilter]);

  useEffect(() => {
    if (tab !== "Activity" || !walletReady || activityReadStatus !== "idle") return;
    void refreshProfileActivity();
  }, [activityReadStatus, refreshProfileActivity, tab, walletReady]);

  async function handleRefreshActivity() {
    const finishPerf = startUiPerf("profileActivityRefreshClick", {
      walletReady,
      readStatus: activityReadStatus
    });
    if (!walletReady) {
      finishPerf("end", { skipped: true });
      return;
    }
    setActivityRefreshing(true);
    try {
      await refreshProfileActivity();
      setActivityVisibleCount(20);
      finishPerf("success", { transactionCount: activityTransactions.length });
    } catch (error) {
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      setActivityRefreshing(false);
    }
  }

  function handleTabChange(nextTab: ProfileTab) {
    const startedAt = uiPerfNow();
    if (nextTab === "Claims") {
      setHistoryTouched(false);
    }
    setTab(nextTab);
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextTab === "Stats") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", nextTab);
    }
    const query = nextParams.toString();
    logUiPerf("profileTabClick", {
      nextTab,
      localStateUpdatedImmediately: true,
      routerAction: "replace",
      asyncRefreshTriggered: nextTab === "Activity" && walletReady && activityReadStatus === "idle"
    });
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    logUiPerf("profileTabClick:end", {
      nextTab,
      syncDurationMs: Math.round(uiPerfNow() - startedAt)
    });
  }

  return (
    <div className="page_stack page_profile">
      <PageHeader
        eyebrow="Profile"
        title="Balance, stats, and Buff Rewards."
        copy="Claims credit Palate Balance first. Wallet withdrawal is a separate action after available balance updates."
        variant="floating"
        density="compact"
        stacked
        lifted
      />

      {!walletReady ? (
        <EmptyState
          variant="section"
          title="Connect wallet to view Profile."
          copy="Profile stats, claims, activity, and Palate Balance management only appear for the connected wallet."
        />
      ) : (
        <>

      <div className="profile_summary_grid">
        <SectionPanel>
          <div className="stat_card">
            <span>Wallet</span>
            <strong className="profile_address_value" title={walletAddress ?? "Not connected"}>{shortenAddress(walletAddress)}</strong>
          </div>
        </SectionPanel>
        <SectionPanel accent>
          <div className="stat_card">
            <span>Palate Balance</span>
            {renderStatValue(balanceOwnedByCurrentWallet ? balance.availableBalance : "Loading")}
          </div>
        </SectionPanel>
        <SectionPanel>
          <div className="stat_card">
            <span>Claimable amount</span>
            {renderStatValue(summaryClaimableValue)}
          </div>
        </SectionPanel>
      </div>

      <SectionPanel title="Manage Palate Balance" copy="Deposit and withdraw available Palate Balance on Aptos Testnet.">
        <div className="profile_balance_controls">
          <AmountInput label="Amount" onChange={setBalanceAmount} placeholder="1.000 APT" value={balanceAmount} />
          <ActionButton disabled={balanceBusy || !walletReady} onClick={() => depositBalance(balanceAmount)} variant="secondary">
            {processingAction === "deposit" ? "Depositing" : "Deposit"}
          </ActionButton>
          <ActionButton disabled={balanceBusy || !walletReady} onClick={() => withdrawBalance(balanceAmount)} variant="secondary">
            {processingAction === "withdraw" ? "Withdrawing" : "Withdraw"}
          </ActionButton>
        </div>
        {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to manage Palate Balance.</p> : null}
        {balanceFeedback ? <p className={`feedback_text feedback_${balanceFeedback.type}`}>{balanceFeedback.message}</p> : null}
      </SectionPanel>

      <FilterBar
        activeKey={tab}
        ariaLabel="Profile views"
        items={[
          { key: "Stats", label: "Stats" },
          { key: "Claims", label: "Claims", count: visibleClaimableRewardsSummary.hasClaimableRewards ? visibleClaimableRewardsSummary.claimableCount : undefined, attention: visibleClaimableRewardsSummary.hasClaimableRewards },
          { key: "Activity", label: "Activity" }
        ]}
        onChange={handleTabChange}
      />

      {tab === "Stats" ? (
        <div className="stack">
          {statsReadMessage ? <p className={`feedback_text ${userSummaryReadStatus === "error" ? "feedback_error" : "feedback_info"}`}>{statsReadMessage}</p> : null}
          {!summaryHasCurrentWalletData && (!summaryOwnedByCurrentWallet || userSummaryReadStatus === "idle" || userSummaryReadStatus === "loading") ? (
            <LoadingState
              variant="section"
              label="Loading profile stats"
              copy="Your on-chain Palate summary is loading."
            />
          ) : (
            <div className="panel_grid">
              {profile_stats.map((stat) => (
                <SectionPanel key={stat.label}>
                  <div className="stat_card">
                    <span>{stat.label}</span>
                    {renderStatValue(stat.value)}
                  </div>
                </SectionPanel>
              ))}
            </div>
          )}
        </div>
      ) : tab === "Claims" ? (
        <div className="stack">
          <SectionPanel title="Claim Center" copy="Claimable rewards stay at the top. Claimed rewards remain available in history after settlement leaves Active Matches.">
            <div className="claim_center_summary">
              <div className="claim_summary_item">
                <span>Claimable</span>
                <strong>{totalClaimableAmount}</strong>
              </div>
              <div className="claim_summary_item">
                <span>Ready</span>
                <strong>{claimableRewardsSummary.claimableCount} rewards</strong>
              </div>
              <div className="claim_summary_item">
                <span>Claimed</span>
                <strong>{claimedClaims.length}</strong>
              </div>
              {claimReadMessage ? (
                <div className="claim_summary_item claim_summary_status">
                  <span>Read status</span>
                  <strong>{claimReadStatus === "error" && claimRecords.length > 0 ? "Using last read" : claimReadStatus === "error" ? "Unavailable" : "Loading"}</strong>
                </div>
              ) : null}
            </div>

            {claimReadMessage ? <p className={`feedback_text ${claimReadStatus === "error" ? "feedback_error" : "feedback_info"}`}>{claimReadMessage}</p> : null}

            {!claimsHaveCurrentWalletData && (!claimsOwnedByCurrentWallet || claimReadStatus === "idle" || claimReadStatus === "loading") ? (
              <LoadingState
                variant="section"
                label="Loading claim records"
                copy="Real claim discovery records are loading from chain."
              />
            ) : claimReadStatus === "error" && !claimsHaveCurrentWalletData && claimRecords.length === 0 ? (
              <ErrorState variant="section" title="Claim records unavailable" copy="Claims could not be loaded from chain right now." />
            ) : claimsOwnedByCurrentWallet && claimRecords.length === 0 && claimReadStatus !== "loading" && claimReadStatus !== "refreshing" ? (
              <EmptyState variant="section" title="No settled rewards yet." copy="Claimable and claimed rewards will appear here after settlement." />
            ) : (
              <div className="claim_center_stack">
                <div className="claim_section_header">
                  <div>
                    <h3>Claimable rewards</h3>
                    <p>Real claim discovery records only. Claiming credits Palate Balance before wallet withdrawal.</p>
                  </div>
                </div>

                {claimableClaims.length > 0 ? (
                  <div className="claim_rows">
                    {claimableClaims.map((claim) => (
                      <ClaimCard
                        actionDisabled={!walletReady}
                        claim={claim}
                        key={claim.claimKey}
                        loading={claimBusy}
                        onClaim={() => claimReward(claim)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="claim_empty_inline">
                    <span>No claimable rewards right now.</span>
                  </div>
                )}

                {claimedClaims.length > 0 ? (
                  <div className="claim_history_section">
                    <button
                      className="claim_history_toggle"
                      onClick={() => {
                        setHistoryTouched(true);
                        setHistoryOpen((current) => !current);
                      }}
                      type="button"
                    >
                      <span>Claimed history</span>
                      <strong>{claimedClaims.length}</strong>
                    </button>
                    {historyOpen ? (
                      <div className="claim_rows claim_rows_history">
                        {claimedClaims.map((claim) => (
                          <ClaimCard actionDisabled claim={claim} key={claim.claimKey} loading={false} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
            {claimFeedback ? <p className={`feedback_text feedback_${claimFeedback.type}`}>{claimFeedback.message}</p> : null}
          </SectionPanel>
        </div>
      ) : (
        <div className="stack">
          <SectionPanel title="Activity">
            <div className="activity_header_bar">
              <div className="activity_header_copy">
                <span className="eyebrow">Activity</span>
              </div>
              <div className="activity_header_actions">
                <span className={`activity_status ${activityReadStatus === "error" ? "activity_status_error" : ""}`}>
                  {activityReadStatus === "error" && activityTransactions.length > 0 ? "Using last read" : activityReadStatus === "error" ? "Unavailable" : activityRefreshing || activityReadStatus === "loading" ? "Loading" : "Ready"}
                </span>
                <ActionButton disabled={!walletReady || activityRefreshing} onClick={handleRefreshActivity} variant="secondary">
                  {activityRefreshing ? "Refreshing..." : "Refresh"}
                </ActionButton>
              </div>
            </div>

            {!walletReady ? (
              <EmptyState variant="section" title="Connect wallet to view activity." copy="Activity only appears for the connected wallet." />
            ) : (
              <div className="activity_stack">
                <FilterBar
                  activeKey={activityFilter}
                  ariaLabel="Activity filters"
                  className="activity_filters_bar"
                  getItemClassName={() => "activity_filter_button"}
                  innerClassName="activity_filters_scroller"
                  items={activity_filters.map((filter) => ({ key: filter, label: filter }))}
                  onChange={(filter) => {
                    const startedAt = uiPerfNow();
                    setActivityFilter(filter);
                    logUiPerf("activityFilterClick", {
                      filter,
                      localStateUpdatedImmediately: true,
                      routerAction: "none",
                      providerRefreshTriggered: false,
                      syncDurationMs: Math.round(uiPerfNow() - startedAt)
                    });
                  }}
                  tabsClassName="activity_filters"
                />

                {activityReadMessage ? <p className={`feedback_text ${activityReadStatus === "error" ? "feedback_error" : "feedback_info"}`}>{activityReadMessage}</p> : null}
                {activityFeedback ? <p className={`feedback_text feedback_${activityFeedback.type}`}>{activityFeedback.message}</p> : null}

                {!activityHasCurrentWalletData && (!activityOwnedByCurrentWallet || activityReadStatus === "idle" || activityReadStatus === "loading") ? (
                  <LoadingState
                    variant="section"
                    label="Loading activity"
                    copy="Palate wallet activity is loading from chain."
                  />
                ) : activityReadStatus === "error" && !activityHasCurrentWalletData && filteredActivityTransactions.length === 0 ? (
                  <ErrorState variant="section" title="Activity unavailable" copy="Palate wallet activity could not be loaded from chain right now." />
                ) : activityOwnedByCurrentWallet && filteredActivityTransactions.length === 0 && activityReadStatus !== "loading" && activityReadStatus !== "refreshing" ? (
                  <EmptyState variant="section" title="No Palate activity yet." copy="Palate transaction history will appear here after the connected wallet sends Palate actions." />
                ) : (
                  <div className="activity_rows">
                    {visibleActivityTransactions.map((transaction) => (
                      <article className="activity_row" key={transaction.id}>
                        <div className="activity_row_main">
                          <span className="activity_type_chip">{transaction.filter}</span>
                          <div className="activity_row_copy">
                            <strong>{transaction.title}</strong>
                            <div className="activity_row_meta">
                              {formatActivityMeta(transaction).map((item) => <span key={`${transaction.id}-${item}`}>{item}</span>)}
                            </div>
                          </div>
                        </div>
                        <div className="activity_row_actions">
                          <Link className="activity_link" href={transaction.explorerUrl} rel="noreferrer" target="_blank">
                            View tx
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {canLoadMoreActivity ? (
                  <div className="activity_load_more">
                    <ActionButton onClick={() => setActivityVisibleCount((current) => current + 20)} variant="secondary">
                      Load more
                    </ActionButton>
                  </div>
                ) : null}
              </div>
            )}
          </SectionPanel>
        </div>
      )}
        </>
      )}
    </div>
  );
}
