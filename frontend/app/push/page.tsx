"use client";

import { useState } from "react";
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
import { formatOctasToApt } from "@/services/aptos_service";
import type { MediaCategory } from "@/types/palate";

const category_labels: Record<MediaCategory, string> = {
  meme: "Meme",
  image: "Image",
  audio: "Audio",
  video: "Video"
};

export default function PushPage() {
  const { activeMatches, challengePush, chainRead, createPush, feedback, mediaRecords, processingAction, waitingPushes } = usePalate();
  const { walletStatus } = usePalateWallet();
  const [tab, setTab] = useState<"Waiting" | "Live Matches">("Waiting");
  const [modalOpen, setModalOpen] = useState(false);
  const [createMediaId, setCreateMediaId] = useState("");
  const [createAmount, setCreateAmount] = useState("1.000");
  const [challengePushId, setChallengePushId] = useState<number | null>(null);
  const [challengeMediaId, setChallengeMediaId] = useState("");
  const [challengeAmount, setChallengeAmount] = useState("6.510");
  const openWaitingPushes = waitingPushes.filter((push) => push.status === "open");
  const selectedPush = openWaitingPushes.find((push) => push.id === challengePushId) ?? openWaitingPushes[0];
  const idleMedia = mediaRecords.filter((media) => media.status === "idle" && media.source === "palate" && media.palateMediaId !== null && media.palateMediaId !== undefined);
  const challengeOptions = selectedPush ? idleMedia.filter((media) => media.category === selectedPush.media.category) : idleMedia;
  const pushBusy = processingAction === "createPush" || processingAction === "challengePush";
  const walletReady = walletStatus === "connected";
  const minPushLabel = chainRead.protocolConfig?.minPushAmount ? formatOctasToApt(chainRead.protocolConfig.minPushAmount) : "1 APT";
  const requiredChallengeLabel = selectedPush?.minChallengeAmount ?? minPushLabel;
  const idleMediaOptions: DropdownOption<string>[] = [
    { label: "Select idle media", value: "" },
    ...idleMedia.map((media) => ({
      label: `${media.title} - ${category_labels[media.category]}`,
      value: String(media.id)
    }))
  ];
  const waitingPushOptions: DropdownOption<string>[] = openWaitingPushes.length > 0
    ? openWaitingPushes.map((push) => ({
        label: `${push.media.title} - minimum ${push.minChallengeAmount}`,
        value: String(push.id)
      }))
    : [{ label: "No waiting pushes", value: "" }];
  const challengeMediaOptions: DropdownOption<string>[] = [
    { label: "Select idle media", value: "" },
    ...challengeOptions.map((media) => ({
      label: `${media.title} - ${category_labels[media.category]}`,
      value: String(media.id)
    }))
  ];

  function openChallenge(pushId: number) {
    const push = openWaitingPushes.find((candidate) => candidate.id === pushId);
    setChallengePushId(pushId);
    setChallengeAmount(push?.minChallengeAmount.replace(" APT", "") ?? "1.000");
    setChallengeMediaId("");
    setModalOpen(true);
  }

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
          <AmountInput label="Push amount" onChange={setCreateAmount} placeholder={`Minimum ${minPushLabel}`} value={createAmount} />
          <ActionButton disabled={pushBusy || !walletReady || !createMediaId} onClick={() => createPush(Number(createMediaId), createAmount)}>
            {processingAction === "createPush" ? "Creating" : "Create Push"}
          </ActionButton>
        </div>
        {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to create or challenge Pushes on Aptos Testnet.</p> : null}
        {feedback ? <p className={`feedback_text feedback_${feedback.type}`}>{feedback.message}</p> : null}
      </SectionPanel>

      {tab === "Waiting" ? (
        <div className="stack">
          {openWaitingPushes.map((push) => (
            <WaitingPushCard key={push.id} push={push} onChallenge={() => openChallenge(push.id)} />
          ))}
        </div>
      ) : (
        <div className="wide_two_column">
          {activeMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}

      <ModalShell title="Challenge Push" open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="stack">
          <p className="secondary_text">Select same-category idle media and enter a push amount at or above the required minimum.</p>
          <CustomDropdown
            label="Waiting push"
            onChange={(nextValue) => setChallengePushId(nextValue ? Number(nextValue) : null)}
            options={waitingPushOptions}
            value={selectedPush ? String(selectedPush.id) : ""}
          />
          <CustomDropdown label="Idle media" onChange={setChallengeMediaId} options={challengeMediaOptions} value={challengeMediaId} />
          <AmountInput label="Challenge amount" onChange={setChallengeAmount} placeholder={`Minimum ${requiredChallengeLabel}`} value={challengeAmount} />
          <div className="state_card">
            <span className="state_mark">Minimum challenge amount</span>
            <strong>{requiredChallengeLabel}</strong>
            <p>Cross-category challenge is blocked by contract rules and should also be blocked in the UI.</p>
          </div>
          {feedback ? <p className={`feedback_text feedback_${feedback.type}`}>{feedback.message}</p> : null}
          <ActionButton
            disabled={pushBusy || !walletReady || !selectedPush || !challengeMediaId}
            onClick={() => {
              if (!selectedPush) return;
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
