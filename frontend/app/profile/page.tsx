"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/action_button";
import { AmountInput } from "@/components/amount_input";
import { EmptyState } from "@/components/empty_state";
import { ClaimCard } from "@/components/claim_card";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { formatOctasToApt } from "@/services/aptos_service";
import { getPushEligibility } from "@/utils/push_eligibility";
import type { ActiveMatch, ClaimRecord, MediaRecord, WaitingPush } from "@/types/palate";

type ProfileTab = "Stats" | "Claims" | "Activity";
type ActivityFilter = "All" | "Media" | "Pushes" | "Matches" | "Claims";
type ActivityRow = {
  id: string;
  filter: ActivityFilter;
  eventType: string;
  title: string;
  shortId?: string;
  amount?: string;
  status: string;
  timestamp?: string | null;
  href?: string;
  actionLabel?: string;
  actionHref?: string;
  actionDisabled?: boolean;
};

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

function classifyProfileFeedback(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("claim")) return "claim";
  if (normalized.includes("reward credited")) return "claim";
  if (normalized.includes("profile claims")) return "claim";
  if (normalized.includes("using last read")) return "activity";
  if (normalized.includes("deposit")) return "balance";
  if (normalized.includes("withdraw")) return "balance";
  if (normalized.includes("available palate balance")) return "balance";
  if (normalized.includes("connect wallet to manage palate balance")) return "balance";

  return "other";
}

function parseProfileTab(value: string | null): ProfileTab {
  if (value === "Claims" || value === "Activity" || value === "Stats") {
    return value;
  }

  return "Stats";
}

function shortenId(value: string | number | null | undefined, prefix = "#") {
  if (value === null || value === undefined) return undefined;
  const text = String(value);
  return text.length > 18 ? `${prefix}${text.slice(0, 8)}...${text.slice(-6)}` : `${prefix}${text}`;
}

function normalizeAddress(address: string | null | undefined) {
  return address?.trim().toLowerCase() ?? "";
}

function getActivityStatusLabel(status: string) {
  if (status === "pending_registration") return "Pending registration";
  if (status === "registration_failed") return "Registration failed";
  if (status === "shelby_upload_failed") return "Shelby upload failed";
  if (status === "delete_pending") return "Delete pending";
  if (status === "content_unavailable") return "Content unavailable";
  if (status === "open") return "Waiting";
  if (status === "active") return "Active";
  if (status === "settled") return "Settled";
  if (status === "claimable") return "Claimable";
  if (status === "claimed") return "Claimed";
  return status.charAt(0).toUpperCase() + status.slice(1);
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

function buildMediaActivityRow(media: MediaRecord): ActivityRow {
  const pushEligibility = getPushEligibility(media);
  const derivedStatus =
    media.deletePending ? "delete_pending"
      : media.contentUnavailable ? "content_unavailable"
        : media.storageStatus === "shelby_upload_failed" ? "shelby_upload_failed"
          : media.status;

  return {
    id: `media-${media.id}`,
    filter: "Media",
    eventType: media.source === "palate_upload_recovery" ? "Recovery" : "Media",
    title: media.title,
    shortId: shortenId(media.palateMediaId ?? media.id),
    status: getActivityStatusLabel(derivedStatus),
    timestamp: media.createdTime || null,
    href: "/my-media",
    actionLabel: pushEligibility.eligible ? "Push" : "View",
    actionHref: pushEligibility.eligible ? `/push?mediaId=${media.id}` : "/my-media",
    actionDisabled: false
  };
}

function buildWaitingPushActivityRow(push: WaitingPush, connectedAddress: string): ActivityRow {
  const isOwnPush = normalizeAddress(push.pusherAddress) === connectedAddress;
  return {
    id: `push-${push.id}`,
    filter: "Pushes",
    eventType: "Push",
    title: push.media.title,
    shortId: shortenId(push.id),
    amount: push.pushAmount,
    status: getActivityStatusLabel(push.status),
    timestamp: push.createdTime || null,
    href: "/push",
    actionLabel: isOwnPush ? "Open Push" : "Challenge",
    actionHref: isOwnPush ? "/push" : `/push?challengeId=${push.id}`
  };
}

function buildMatchActivityRow(match: ActiveMatch): ActivityRow {
  const readyToSettle = match.status === "active" && match.timeRemaining === "Ready to settle";
  return {
    id: `match-${match.id}`,
    filter: "Matches",
    eventType: "Match",
    title: `${match.mediaA.title} vs ${match.mediaB.title}`,
    shortId: shortenId(match.id),
    amount: `${match.pushAmountA} / ${match.pushAmountB}`,
    status: readyToSettle ? "Ready to settle" : getActivityStatusLabel(match.status),
    timestamp: null,
    href: match.status === "settled" ? "/profile?tab=Claims" : "/buff",
    actionLabel: match.status === "settled" ? "View Claims" : "Open Buff",
    actionHref: match.status === "settled" ? "/profile?tab=Claims" : "/buff"
  };
}

function buildClaimActivityRow(claim: ClaimRecord): ActivityRow {
  const claimable = claim.claimable && !claim.claimed && BigInt(claim.claimableAmountOctas) > BigInt(0);
  return {
    id: `claim-${claim.claimKey}`,
    filter: "Claims",
    eventType: claim.type === "buff" ? "Buff reward" : "Push reward",
    title: claim.matchRef,
    shortId: shortenId(claim.matchId),
    amount: claim.amount,
    status: claim.claimed ? "Claimed" : claimable ? "Claimable" : "Unavailable",
    timestamp: null,
    href: "/profile?tab=Claims",
    actionLabel: claimable ? "Claim" : "Open Claims",
    actionHref: "/profile?tab=Claims",
    actionDisabled: !claimable
  };
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="page_stack page_profile" />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const {
    activeMatches,
    activityReadStatus,
    balance,
    claimReadStatus,
    claimRecords,
    claimReward,
    claimableRewardsSummary,
    depositBalance,
    feedback,
    mediaRecords,
    processingAction,
    refreshProfileActivity,
    settleMatch,
    userSummary,
    userSummaryReadStatus,
    waitingPushes,
    withdrawBalance
  } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ProfileTab>(parseProfileTab(searchParams.get("tab")));
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("All");
  const [balanceAmount, setBalanceAmount] = useState("1.000");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTouched, setHistoryTouched] = useState(false);
  const [activityRefreshing, setActivityRefreshing] = useState(false);
  const balanceBusy = processingAction === "deposit" || processingAction === "withdraw";
  const walletReady = walletStatus === "connected" && Boolean(walletAddress);
  const claimBusy = processingAction === "claimReward";
  const settleBusy = processingAction === "settleMatch";
  const connectedAddress = normalizeAddress(walletAddress);
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
  const claimReadMessage =
    claimReadStatus === "loading"
      ? "Loading claims."
      : claimReadStatus === "error"
        ? claimRecords.length > 0
          ? "Claims temporarily unavailable. Using last read."
          : "Claims temporarily unavailable."
        : null;
  const statsReadMessage =
    userSummaryReadStatus === "loading"
      ? "Loading stats."
      : userSummaryReadStatus === "error"
        ? Object.values(userSummary).some((value) => value !== "Unavailable" && value !== "Loading" && value !== "" && value !== walletAddress)
          ? "Stats temporarily unavailable. Using last read."
          : "Stats temporarily unavailable."
        : null;
  const summaryClaimableValue =
    claimReadStatus === "loading" && claimRecords.length === 0
      ? "Loading"
      : claimReadStatus === "error" && claimRecords.length === 0
        ? "Unavailable"
        : totalClaimableAmount;
  const profileFeedbackTarget = feedback ? classifyProfileFeedback(feedback.message) : null;
  const balanceFeedback = profileFeedbackTarget === "balance" ? feedback : null;
  const claimFeedback = profileFeedbackTarget === "claim" ? feedback : null;
  const activityFeedback = profileFeedbackTarget === "activity" ? feedback : null;

  const userMediaActivity = useMemo(
    () => mediaRecords
      .filter((media) => normalizeAddress(media.ownerAddress) === connectedAddress)
      .map(buildMediaActivityRow),
    [connectedAddress, mediaRecords]
  );
  const userWaitingPushActivity = useMemo(
    () => waitingPushes
      .filter((push) => normalizeAddress(push.pusherAddress) === connectedAddress || normalizeAddress(push.media.ownerAddress) === connectedAddress)
      .map((push) => buildWaitingPushActivityRow(push, connectedAddress)),
    [connectedAddress, waitingPushes]
  );
  const userMatchActivity = useMemo(
    () => activeMatches
      .filter((match) =>
        normalizeAddress(match.pusherA) === connectedAddress
          || normalizeAddress(match.pusherB) === connectedAddress
          || normalizeAddress(match.mediaA.ownerAddress) === connectedAddress
          || normalizeAddress(match.mediaB.ownerAddress) === connectedAddress
      )
      .map(buildMatchActivityRow),
    [activeMatches, connectedAddress]
  );
  const claimActivity = useMemo(() => claimRecords.map(buildClaimActivityRow), [claimRecords]);
  const activityRows = useMemo(
    () => [...userMediaActivity, ...userWaitingPushActivity, ...userMatchActivity, ...claimActivity],
    [claimActivity, userMatchActivity, userMediaActivity, userWaitingPushActivity]
  );
  const filteredActivityRows = useMemo(
    () => activityRows.filter((row) => activityFilter === "All" || row.filter === activityFilter),
    [activityFilter, activityRows]
  );
  const activityReadMessage =
    activityReadStatus === "loading" || activityRefreshing
      ? "Loading activity."
      : activityReadStatus === "error"
        ? activityRows.length > 0
          ? "Activity temporarily unavailable. Using last read."
          : "Activity temporarily unavailable."
        : null;
  const activitySummary = useMemo(
    () => ({
      mediaCount: userMediaActivity.length,
      waitingPushCount: userWaitingPushActivity.length,
      activeMatchCount: userMatchActivity.length,
      claimableCount: claimableRewardsSummary.claimableCount,
      claimedCount: claimedClaims.length
    }),
    [claimableRewardsSummary.claimableCount, claimedClaims.length, userMatchActivity.length, userMediaActivity.length, userWaitingPushActivity.length]
  );

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

  async function handleRefreshActivity() {
    if (!walletReady) return;
    setActivityRefreshing(true);
    try {
      await refreshProfileActivity();
    } finally {
      setActivityRefreshing(false);
    }
  }

  function handleTabChange(nextTab: ProfileTab) {
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
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="page_stack page_profile">
      <PageHeader
        eyebrow="Profile"
        title="Balance, stats, and Buff Rewards."
        copy="Claims credit Palate Balance first. Wallet withdrawal is a separate action after available balance updates."
      />

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
            {renderStatValue(balance.availableBalance)}
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

      <SectionPanel>
        <div className="tabs">
          {(["Stats", "Claims", "Activity"] as const).map((item) => (
            <button
              className={`tab_button ${tab === item ? "active" : ""} ${item === "Claims" && claimableRewardsSummary.hasClaimableRewards ? "tab_button_attention" : ""}`}
              key={item}
              onClick={() => handleTabChange(item)}
            >
              {item}
              {item === "Claims" && claimableRewardsSummary.hasClaimableRewards ? <span className="tab_badge">{claimableRewardsSummary.claimableCount}</span> : null}
            </button>
          ))}
        </div>
      </SectionPanel>

      {tab === "Stats" ? (
        <div className="stack">
          {statsReadMessage ? <p className={`feedback_text ${userSummaryReadStatus === "error" ? "feedback_error" : "feedback_info"}`}>{statsReadMessage}</p> : null}
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

            {claimRecords.length === 0 && claimReadStatus !== "loading" ? (
              <EmptyState title="No settled rewards yet." copy="Claimable and claimed rewards will appear here after settlement." />
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
                          <ClaimCard
                            actionDisabled
                            claim={claim}
                            key={claim.claimKey}
                            loading={false}
                          />
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
          <SectionPanel title="Activity" copy="Your recent on-chain and local Palate activity in one place.">
            <div className="activity_header_bar">
              <div className="activity_header_copy">
                <span className="eyebrow">Activity</span>
                <p>Media, pushes, matches, and rewards use only real connected-wallet data.</p>
              </div>
              <div className="activity_header_actions">
                <span className={`activity_status ${activityReadStatus === "error" ? "activity_status_error" : ""}`}>
                  {activityReadStatus === "error" && activityRows.length > 0 ? "Using last read" : activityReadStatus === "error" ? "Unavailable" : activityRefreshing || activityReadStatus === "loading" ? "Loading" : "Ready"}
                </span>
                <ActionButton disabled={!walletReady || activityRefreshing} onClick={handleRefreshActivity} variant="secondary">
                  {activityRefreshing ? "Refreshing..." : "Refresh"}
                </ActionButton>
              </div>
            </div>

            {!walletReady ? (
              <EmptyState title="Connect wallet to view activity." copy="Activity only appears for the connected wallet." />
            ) : (
              <div className="activity_stack">
                <div className="activity_summary_strip">
                  <div className="activity_summary_item"><span>Media</span><strong>{activitySummary.mediaCount}</strong></div>
                  <div className="activity_summary_item"><span>Waiting pushes</span><strong>{activitySummary.waitingPushCount}</strong></div>
                  <div className="activity_summary_item"><span>Active matches</span><strong>{activitySummary.activeMatchCount}</strong></div>
                  <div className="activity_summary_item"><span>Claimable</span><strong>{activitySummary.claimableCount}</strong></div>
                  <div className="activity_summary_item"><span>Claimed</span><strong>{activitySummary.claimedCount}</strong></div>
                </div>

                <div className="activity_filters">
                  {(["All", "Media", "Pushes", "Matches", "Claims"] as const).map((filter) => (
                    <button
                      className={`activity_filter_button ${activityFilter === filter ? "active" : ""}`}
                      key={filter}
                      onClick={() => setActivityFilter(filter)}
                      type="button"
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {activityReadMessage ? <p className={`feedback_text ${activityReadStatus === "error" ? "feedback_error" : "feedback_info"}`}>{activityReadMessage}</p> : null}
                {activityFeedback ? <p className={`feedback_text feedback_${activityFeedback.type}`}>{activityFeedback.message}</p> : null}

                {filteredActivityRows.length === 0 ? (
                  <EmptyState title="No activity yet." copy="Your connected wallet has no real media, push, match, or reward activity yet." />
                ) : (
                  <div className="activity_rows">
                    {filteredActivityRows.map((row) => (
                      <article className="activity_row" key={row.id}>
                        <div className="activity_row_main">
                          <span className="activity_type_chip">{row.eventType}</span>
                          <div className="activity_row_copy">
                            <strong>{row.title}</strong>
                            <div className="activity_row_meta">
                              {row.shortId ? <span>{row.shortId}</span> : null}
                              <span>{row.status}</span>
                              {row.timestamp ? <span>{row.timestamp}</span> : null}
                              {row.amount ? <span>{row.amount}</span> : null}
                            </div>
                          </div>
                        </div>
                        <div className="activity_row_actions">
                          {row.href ? <Link className="activity_link" href={row.href}>Open</Link> : null}
                          {row.actionHref ? (
                            <ActionButton disabled={row.actionDisabled} href={row.actionHref} variant="ghost">
                              {row.actionLabel}
                            </ActionButton>
                          ) : null}
                          {row.filter === "Claims" && row.actionLabel === "Claim" ? (
                            <ActionButton
                              disabled={claimBusy}
                              onClick={() => {
                                const claim = claimRecords.find((candidate) => `claim-${candidate.claimKey}` === row.id);
                                if (claim) {
                                  void claimReward(claim);
                                }
                              }}
                              variant="primary"
                            >
                              {claimBusy ? "Claiming..." : "Claim"}
                            </ActionButton>
                          ) : null}
                          {row.filter === "Matches" && row.status === "Ready to settle" ? (
                            <ActionButton
                              disabled={settleBusy}
                              onClick={() => {
                                const match = activeMatches.find((candidate) => `match-${candidate.id}` === row.id);
                                if (match) {
                                  void settleMatch(match.id);
                                }
                              }}
                              variant="secondary"
                            >
                              {settleBusy ? "Settling..." : "Settle"}
                            </ActionButton>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SectionPanel>
        </div>
      )}
    </div>
  );
}
