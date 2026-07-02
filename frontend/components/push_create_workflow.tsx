"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { AmountInput } from "@/components/amount_input";
import { CustomDropdown, type DropdownOption } from "@/components/custom_dropdown";
import { EmptyState } from "@/components/empty_state";
import { LoadingState } from "@/components/loading_state";
import { ModalShell } from "@/components/modal_shell";
import { SectionPanel } from "@/components/section_panel";
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

type PushCreateWorkflowProps =
  | {
      presentation?: "inline";
      sourceContext?: string;
      mediaIdQuery?: string | null;
      onMediaQueryApplied?: () => void;
    }
  | {
      presentation: "modal";
      open: boolean;
      onClose: () => void;
      sourceContext?: string;
      mediaIdQuery?: string | null;
      onMediaQueryApplied?: () => void;
    };

export function PushCreateWorkflow(props: PushCreateWorkflowProps) {
  const presentation = props.presentation ?? "inline";
  const modalOpen = presentation === "modal" ? props.open : false;
  const onClose = presentation === "modal" ? props.onClose : null;
  const mediaIdQuery = props.mediaIdQuery ?? null;
  const onMediaQueryApplied = props.onMediaQueryApplied;
  const { balance, chainRead, createPush, feedback, mediaReadStatus, mediaRecords, processingAction, walletReadCache } = usePalate();
  const { walletAddress, walletStatus } = usePalateWallet();
  const [createMediaId, setCreateMediaId] = useState("");
  const [createAmount, setCreateAmount] = useState("1.000");
  const [prefillReason, setPrefillReason] = useState<string | null>(null);
  const [lastAppliedCreateMediaQuery, setLastAppliedCreateMediaQuery] = useState<string | null>(null);
  const normalizedWalletAddress = normalizeAddress(walletAddress);
  const mediaOwnedByCurrentWallet = walletReadCache.userMedia.ownerAddress === normalizedWalletAddress;
  const mediaHasCurrentWalletData = mediaOwnedByCurrentWallet && walletReadCache.userMedia.lastSuccessfulReadAt !== null;
  const pushableMedia = useMemo(() => mediaRecords.filter((media) =>
    (media.status === "idle" || media.status === "settled" || (media.status === "waiting" && media.waitingPushExpired === true && typeof media.waitingPushId === "number"))
      && getPushEligibility(media, { allowExpiredWaitingPush: true }).eligible
  ), [mediaRecords]);
  const pushFeedback = feedback?.scope === "push" ? feedback : null;
  const pushBusy = processingAction === "createPush";
  const walletReady = walletStatus === "connected";
  const minPushOctas = chainRead.protocolConfig?.minPushAmount ? BigInt(chainRead.protocolConfig.minPushAmount) : null;
  const minPushLabel = minPushOctas !== null ? formatOctasToApt(minPushOctas) : "loading";
  const createAmountValidation = validateAmount(createAmount, minPushOctas, "Minimum Push");
  const availableBalanceOctas = parseAmountOctas(balance.availableBalance);
  const createAmountOctas = parseAmountOctas(createAmount);
  const createBalanceValid = createAmountOctas !== null && availableBalanceOctas !== null && createAmountOctas <= availableBalanceOctas;
  const createAmountHelperText = !createAmountValidation.valid
    ? createAmountValidation.message
    : !createBalanceValid
      ? "Not enough Palate Balance."
      : createAmountValidation.message;
  const canCreatePush = walletReady && !pushBusy && Boolean(createMediaId) && createAmountValidation.valid && createBalanceValid;
  const createPushLoading = walletReady && (!mediaOwnedByCurrentWallet || ((mediaReadStatus === "idle" || mediaReadStatus === "loading") && !mediaHasCurrentWalletData));
  const idleMediaOptions: DropdownOption<string>[] = [
    { label: "Select idle media", value: "" },
    ...pushableMedia.map((media) => ({
      label: `${getMediaDisplayTitle(media)} - ${category_labels[media.category]}`,
      value: String(media.id)
    }))
  ];

  useEffect(() => {
    if (!mediaIdQuery) {
      setLastAppliedCreateMediaQuery(null);
      return;
    }

    if (mediaIdQuery === lastAppliedCreateMediaQuery) {
      return;
    }

    const nextId = Number(mediaIdQuery);
    if (Number.isNaN(nextId)) {
      setLastAppliedCreateMediaQuery(mediaIdQuery);
      onMediaQueryApplied?.();
      return;
    }

    const candidate = mediaRecords.find((item) => item.id === nextId);
    if (!candidate) {
      setCreateMediaId("");
      setPrefillReason("Selected media is no longer available.");
      setLastAppliedCreateMediaQuery(mediaIdQuery);
      onMediaQueryApplied?.();
      return;
    }

    const eligibility = getPushEligibility(candidate, { allowExpiredWaitingPush: true });
    if (eligibility.eligible) {
      setCreateMediaId(String(candidate.id));
      setPrefillReason(null);
      setLastAppliedCreateMediaQuery(mediaIdQuery);
      onMediaQueryApplied?.();
      return;
    }

    setCreateMediaId("");
    setPrefillReason(eligibility.reason);
    setLastAppliedCreateMediaQuery(mediaIdQuery);
    onMediaQueryApplied?.();
  }, [lastAppliedCreateMediaQuery, mediaIdQuery, mediaRecords, onMediaQueryApplied]);

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

    const eligibility = getPushEligibility(candidate, { allowExpiredWaitingPush: true });
    if (!eligibility.eligible) {
      setCreateMediaId("");
      setPrefillReason(eligibility.reason);
    }
  }, [createMediaId, mediaRecords]);

  const content = !walletReady ? (
    <EmptyState
      variant="section"
      title="Connect wallet to create a Push."
      copy="User media selection and Push creation only appear for the connected wallet."
    />
  ) : createPushLoading ? (
    <LoadingState
      variant="section"
      label="Loading push inventory"
      copy="Idle media and protocol minimums are loading from chain."
    />
  ) : (
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
  );

  const feedbackBlock = (
    <>
      {prefillReason ? <p className="feedback_text feedback_error">{prefillReason}</p> : null}
      {pushFeedback ? <p className={`feedback_text feedback_${pushFeedback.type}`}>{pushFeedback.message}</p> : null}
    </>
  );

  if (presentation === "modal") {
    return (
      <ModalShell
        onClose={onClose!}
        open={modalOpen}
        subtitle="Choose eligible idle media, set the push amount, and publish it to the waiting board."
        title="Push Media"
      >
        <>
          {content}
          {feedbackBlock}
        </>
      </ModalShell>
    );
  }

  return (
    <SectionPanel title="Create push" copy="Use Palate Balance and mark selected idle media as waiting for a challenger.">
      {content}
      {feedbackBlock}
    </SectionPanel>
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
