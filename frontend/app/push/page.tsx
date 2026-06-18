"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionButton } from "@/components/action_button";
import { AmountInput } from "@/components/amount_input";
import { CustomDropdown, type DropdownOption } from "@/components/custom_dropdown";
import { MatchCard } from "@/components/match_card";
import { ModalShell } from "@/components/modal_shell";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { WaitingPushCard } from "@/components/waiting_push_card";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import { formatOctasToApt, parseAptToOctas } from "@/services/aptos_service";
import type { MediaCategory } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { getPushEligibility } from "@/utils/push_eligibility";

const category_labels: Record<MediaCategory, string> = {
  meme: "Meme",
  image: "Image",
  audio: "Audio",
  video: "Video"
};

export default function PushPage() {
  return (
    <Suspense fallback={<div className="page_stack page_push" />}>
      <PushPageContent />
    </Suspense>
  );
}

function PushPageContent() {
  const { activeMatches, balance, challengePush, chainRead, createPush, feedback, mediaRecords, processingAction, settleMatch, waitingPushes } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"Waiting" | "Live Matches">("Waiting");
  const [modalOpen, setModalOpen] = useState(false);
  const [createMediaId, setCreateMediaId] = useState("");
  const [createAmount, setCreateAmount] = useState("1.000");
  const [challengePushId, setChallengePushId] = useState<number | null>(null);
  const [challengeMediaId, setChallengeMediaId] = useState("");
  const [challengeAmount, setChallengeAmount] = useState("6.510");
  const [prefillReason, setPrefillReason] = useState<string | null>(null);
  const [dismissedChallengeId, setDismissedChallengeId] = useState<number | null>(null);
  const [lastAppliedCreateMediaQuery, setLastAppliedCreateMediaQuery] = useState<string | null>(null);
  const [lastAppliedChallengeQuery, setLastAppliedChallengeQuery] = useState<string | null>(null);
  const createMediaQuery = searchParams.get("mediaId");
  const challengePushQuery = searchParams.get("challengeId") ?? searchParams.get("pushId");
  const openWaitingPushes = waitingPushes.filter((push) =>
    push.status === "open"
      && getPushEligibility(push.media, { requireIdle: false }).eligible
  );
  const selectedPush = openWaitingPushes.find((push) => push.id === challengePushId) ?? null;
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const selectedPushIsOwned = Boolean(
    selectedPush
      && normalizedWalletAddress
      && normalizeAddress(selectedPush.pusherAddress) === normalizedWalletAddress
  );
  const selfChallengeReason = selectedPushIsOwned ? "You cannot challenge your own push." : null;
  const idleMedia = mediaRecords.filter((media) =>
    media.status === "idle"
      && getPushEligibility(media).eligible
  );
  const challengeOptions = selectedPush ? idleMedia.filter((media) => media.category === selectedPush.media.category) : idleMedia;
  const challengeMediaEmptyMessage = selectedPush && challengeOptions.length === 0 ? "No eligible same-category media available." : null;
  const pushBusy = processingAction === "createPush" || processingAction === "challengePush";
  const walletReady = walletStatus === "connected";
  const minPushOctas = chainRead.protocolConfig?.minPushAmount ? BigInt(chainRead.protocolConfig.minPushAmount) : null;
  const minPushLabel = minPushOctas !== null ? formatOctasToApt(minPushOctas) : "loading";
  const requiredChallengeOctas = selectedPush?.minChallengeAmountOctas
    ? BigInt(selectedPush.minChallengeAmountOctas)
    : minPushOctas;
  const effectiveChallengeOctas = minPushOctas !== null && requiredChallengeOctas !== null
    ? (requiredChallengeOctas > minPushOctas ? requiredChallengeOctas : minPushOctas)
    : null;
  const requiredChallengeLabel = effectiveChallengeOctas !== null ? formatOctasToApt(effectiveChallengeOctas) : minPushLabel;
  const createAmountValidation = validateAmount(createAmount, minPushOctas, "Minimum Push");
  const challengeAmountValidation = validateAmount(challengeAmount, effectiveChallengeOctas, "Minimum challenge");
  const availableBalanceOctas = parseAmountOctas(balance.availableBalance);
  const createAmountOctas = parseAmountOctas(createAmount);
  const challengeAmountOctas = parseAmountOctas(challengeAmount);
  const createBalanceValid = createAmountOctas !== null && availableBalanceOctas !== null && createAmountOctas <= availableBalanceOctas;
  const challengeBalanceValid = challengeAmountOctas !== null && availableBalanceOctas !== null && challengeAmountOctas <= availableBalanceOctas;
  const createAmountHelperText = !createAmountValidation.valid
    ? createAmountValidation.message
    : !createBalanceValid
      ? "Not enough Palate Balance."
      : createAmountValidation.message;
  const challengeAmountHelperText = !challengeAmountValidation.valid
    ? challengeAmountValidation.message
    : !challengeBalanceValid
      ? "Not enough Palate Balance."
      : challengeAmountValidation.message;
  const canCreatePush = walletReady && !pushBusy && Boolean(createMediaId) && createAmountValidation.valid && createBalanceValid;
  const idleMediaOptions: DropdownOption<string>[] = [
    { label: "Select idle media", value: "" },
    ...idleMedia.map((media) => ({
      label: `${getMediaDisplayTitle(media)} - ${category_labels[media.category]}`,
      value: String(media.id)
    }))
  ];
  const waitingPushOptions: DropdownOption<string>[] = openWaitingPushes.length > 0
    ? openWaitingPushes.map((push) => ({
        label: `${getMediaDisplayTitle(push.media)} - minimum ${push.minChallengeAmount}`,
        value: String(push.id)
      }))
    : [{ label: "No waiting pushes", value: "" }];
  const challengeMediaOptions: DropdownOption<string>[] = [
    challengeMediaEmptyMessage
      ? { label: challengeMediaEmptyMessage, value: "" }
      : { label: "Select idle media", value: "" },
    ...challengeOptions.map((media) => ({
      label: `${getMediaDisplayTitle(media)} - ${category_labels[media.category]}`,
      value: String(media.id)
    }))
  ];

  const replacePushQuery = useCallback((next: URLSearchParams) => {
    const query = next.toString();
    router.replace(query ? `/push?${query}` : "/push", { scroll: false });
  }, [router]);

  const clearChallengeQuery = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("challengeId");
    next.delete("pushId");
    replacePushQuery(next);
  }, [replacePushQuery, searchParams]);

  function closeChallengeModal() {
    setModalOpen(false);
    setDismissedChallengeId(challengePushId);
    setChallengePushId(null);
    setChallengeMediaId("");
    clearChallengeQuery();
  }

  useEffect(() => {
    if (!createMediaQuery) {
      setLastAppliedCreateMediaQuery(null);
      return;
    }

    if (createMediaQuery === lastAppliedCreateMediaQuery) {
      return;
    }

    const nextId = Number(createMediaQuery);
    if (Number.isNaN(nextId)) {
      setLastAppliedCreateMediaQuery(createMediaQuery);
      return;
    }

    const candidate = mediaRecords.find((item) => item.id === nextId);
    if (!candidate) {
      setCreateMediaId("");
      setPrefillReason("Selected media is no longer available.");
      setLastAppliedCreateMediaQuery(createMediaQuery);
      return;
    }

    const eligibility = getPushEligibility(candidate);
    if (eligibility.eligible) {
      setCreateMediaId(String(candidate.id));
      setPrefillReason(null);
      setTab("Waiting");
      setLastAppliedCreateMediaQuery(createMediaQuery);
      return;
    }

    setCreateMediaId("");
    setPrefillReason(eligibility.reason);
    setTab("Waiting");
    setLastAppliedCreateMediaQuery(createMediaQuery);
  }, [createMediaQuery, lastAppliedCreateMediaQuery, mediaRecords]);

  useEffect(() => {
    if (!createMediaId) {
      return;
    }

    const candidate = mediaRecords.find((item) => String(item.id) === createMediaId);
    if (!candidate) {
      setCreateMediaId("");
      setPrefillReason("Selected media is no longer available.");
      return;
    }

    const eligibility = getPushEligibility(candidate);
    if (!eligibility.eligible) {
      setCreateMediaId("");
      setPrefillReason(eligibility.reason);
    }
  }, [createMediaId, mediaRecords]);

  useEffect(() => {
    if (!challengePushQuery) {
      setLastAppliedChallengeQuery(null);
      return;
    }

    if (challengePushQuery === lastAppliedChallengeQuery) {
      return;
    }

    const nextId = Number(challengePushQuery);
    if (Number.isNaN(nextId)) {
      clearChallengeQuery();
      setLastAppliedChallengeQuery(challengePushQuery);
      return;
    }

    if (dismissedChallengeId === nextId) {
      return;
    }

    const push = openWaitingPushes.find((candidate) => candidate.id === nextId);
    if (!push) {
      setPrefillReason("Selected waiting push is no longer available.");
      setChallengePushId(null);
      setChallengeMediaId("");
      setModalOpen(false);
      clearChallengeQuery();
      setLastAppliedChallengeQuery(challengePushQuery);
      return;
    }

    setChallengePushId(nextId);
    setChallengeAmount(push.minChallengeAmount.replace(" APT", ""));
    setChallengeMediaId("");
    setModalOpen(true);
    setTab("Waiting");
    setLastAppliedChallengeQuery(challengePushQuery);
  }, [challengePushQuery, clearChallengeQuery, dismissedChallengeId, lastAppliedChallengeQuery, openWaitingPushes]);

  useEffect(() => {
    if (challengePushId === null || selectedPush || !modalOpen) {
      return;
    }

    setPrefillReason("Selected waiting push is no longer available.");
    setChallengePushId(null);
    setChallengeMediaId("");
    setModalOpen(false);
    clearChallengeQuery();
  }, [challengePushId, clearChallengeQuery, modalOpen, selectedPush]);

  function openChallenge(pushId: number) {
    const push = openWaitingPushes.find((candidate) => candidate.id === pushId);
    if (!push) {
      setPrefillReason("Selected waiting push is no longer available.");
      clearChallengeQuery();
      return;
    }

    if (normalizedWalletAddress && normalizeAddress(push.pusherAddress) === normalizedWalletAddress) {
      setPrefillReason("You cannot challenge your own push.");
      setDismissedChallengeId(null);
      return;
    }

    const next = new URLSearchParams(searchParams.toString());
    next.set("challengeId", String(pushId));
    next.delete("pushId");
    setDismissedChallengeId(null);
    setPrefillReason(null);
    setLastAppliedChallengeQuery(String(pushId));
    setChallengePushId(pushId);
    setChallengeAmount(push?.minChallengeAmount.replace(" APT", "") ?? "1.000");
    setChallengeMediaId("");
    setModalOpen(true);
    setTab("Waiting");
    replacePushQuery(next);
  }

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    mediaRecords.forEach((media) => {
      const eligibility = getPushEligibility(media);
      console.debug("[Palate Push eligibility]", {
        mediaId: media.id,
        title: getMediaDisplayTitle(media),
        status: media.status,
        storageStatus: media.storageStatus ?? "uploaded",
        category: media.category,
        reason: eligibility.reason
      });
    });
  }, [mediaRecords]);

  return (
    <div className="page_stack page_push">
      <PageHeader
        eyebrow="Push"
        title="Challenge the board without exposing live match direction."
        copy="Waiting pushes can be challenged by same-category idle media. Live match cards hide score, Buff pool, leading side, odds, and win probability."
        actions={<ActionButton href="/my-media">Choose Media To Push</ActionButton>}
      />

      <SectionPanel>
        <div className="tabs">
          {(["Waiting", "Live Matches"] as const).map((item) => (
            <button className={`tab_button ${tab === item ? "active" : ""}`} key={item} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="Create push" copy="Use Palate Balance and mark selected idle media as waiting for a challenger.">
        <div className="mock_form_grid">
          <CustomDropdown label="Idle media" onChange={setCreateMediaId} options={idleMediaOptions} value={createMediaId} />
          <div className="amount_field_stack">
            <AmountInput label="Push amount" onChange={setCreateAmount} placeholder={`Minimum ${minPushLabel}`} value={createAmount} />
            <p className={`amount_helper ${createAmountValidation.valid && createBalanceValid ? "" : "amount_helper_error"}`}>
              {createAmountHelperText}
            </p>
          </div>
          <ActionButton disabled={pushBusy || !canCreatePush} onClick={() => createPush(Number(createMediaId), createAmount)}>
            {processingAction === "createPush" ? "Creating" : "Create Push"}
          </ActionButton>
        </div>
        {prefillReason ? <p className="feedback_text feedback_error">{prefillReason}</p> : null}
        {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to create or challenge Pushes on Aptos Testnet.</p> : null}
        {feedback ? <p className={`feedback_text feedback_${feedback.type}`}>{feedback.message}</p> : null}
      </SectionPanel>

      {tab === "Waiting" ? (
        <div className="compact_card_grid compact_card_grid_waiting">
          {openWaitingPushes.map((push) => (
            <WaitingPushCard
              key={push.id}
              push={push}
              challengeDisabledReason={
                normalizedWalletAddress && normalizeAddress(push.pusherAddress) === normalizedWalletAddress
                  ? "You cannot challenge your own push."
                  : null
              }
              onChallenge={() => openChallenge(push.id)}
            />
          ))}
        </div>
      ) : (
        <div className="compact_card_grid compact_card_grid_matches">
          {activeMatches.map((match) => (
            <MatchCard
              actionHref="/buff"
              key={match.id}
              match={match}
              onSettle={match.status === "active" ? () => settleMatch(match.id) : undefined}
            />
          ))}
        </div>
      )}

      <ModalShell title="Challenge Push" open={modalOpen} onClose={closeChallengeModal}>
        <div className="stack challenge_modal_content">
          <p className="secondary_text">Select same-category idle media and enter a push amount at or above the required minimum.</p>
          <CustomDropdown
            label="Waiting push"
            onChange={(nextValue) => setChallengePushId(nextValue ? Number(nextValue) : null)}
            options={waitingPushOptions}
            value={selectedPush ? String(selectedPush.id) : ""}
          />
          <CustomDropdown label="Idle media" onChange={setChallengeMediaId} options={challengeMediaOptions} value={challengeMediaId} />
          {challengeMediaEmptyMessage ? <p className="feedback_text feedback_error">{challengeMediaEmptyMessage}</p> : null}
          {selfChallengeReason ? <p className="feedback_text feedback_error">{selfChallengeReason}</p> : null}
          <div className="amount_field_stack">
            <AmountInput label="Challenge amount" onChange={setChallengeAmount} placeholder={`Minimum ${requiredChallengeLabel}`} value={challengeAmount} />
            <p className={`amount_helper ${challengeAmountValidation.valid && challengeBalanceValid ? "" : "amount_helper_error"}`}>
              {challengeAmountHelperText}
            </p>
          </div>
          <div className="state_card">
            <span className="state_mark">Minimum challenge amount</span>
            <strong>{requiredChallengeLabel}</strong>
            <p>Cross-category challenge is blocked by contract rules and should also be blocked in the UI.</p>
          </div>
          {feedback ? <p className={`feedback_text feedback_${feedback.type}`}>{feedback.message}</p> : null}
          <ActionButton
            disabled={pushBusy || !walletReady || !selectedPush || selectedPushIsOwned || !challengeMediaId || !challengeAmountValidation.valid || !challengeBalanceValid}
            onClick={() => {
              if (!selectedPush || selectedPushIsOwned) return;
              challengePush(selectedPush.id, Number(challengeMediaId), challengeAmount);
            }}
          >
            {processingAction === "challengePush" ? "Challenging" : "Confirm Challenge"}
          </ActionButton>
        </div>
      </ModalShell>
    </div>
  );
}

function normalizeAddress(address: string | null | undefined) {
  return address?.trim().toLowerCase() ?? null;
}

function validateAmount(value: string, minimumOctas: bigint | null, label: string) {
  if (minimumOctas === null) {
    return { valid: false, message: `${label}: loading` };
  }

  const minimumText = formatOctasToApt(minimumOctas);

  try {
    const parsed = BigInt(parseAptToOctas(value));
    if (parsed < minimumOctas) {
      return { valid: false, message: `${label} is ${minimumText}` };
    }

    return { valid: true, message: `${label}: ${minimumText}` };
  } catch {
    return { valid: false, message: `${label} is ${minimumText}` };
  }
}

function parseAmountOctas(value: string) {
  try {
    return BigInt(parseAptToOctas(value, { allowZero: true }));
  } catch {
    return null;
  }
}
