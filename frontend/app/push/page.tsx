"use client";

import { useState } from "react";
import { ActionButton } from "@/components/action_button";
import { AmountInput } from "@/components/amount_input";
import { MatchCard } from "@/components/match_card";
import { ModalShell } from "@/components/modal_shell";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { WaitingPushCard } from "@/components/waiting_push_card";
import { mock_matches, mock_media, mock_waiting_pushes } from "@/data/mock_data";

export default function PushPage() {
  const [tab, setTab] = useState<"Waiting" | "Live Matches">("Waiting");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="page_stack">
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

      {tab === "Waiting" ? (
        <div className="stack">
          {mock_waiting_pushes.map((push) => (
            <WaitingPushCard key={push.id} push={push} onChallenge={() => setModalOpen(true)} />
          ))}
        </div>
      ) : (
        <div className="wide_two_column">
          {mock_matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}

      <ModalShell title="Challenge Push" open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="stack">
          <p className="secondary_text">Select same-category idle media and enter a push amount at or above the required minimum.</p>
          <label className="amount_input">
            <span>Idle media</span>
            <select className="input_control">
              {mock_media
                .filter((media) => media.status === "Idle" && media.category === "Meme")
                .map((media) => (
                  <option key={media.id}>{media.title} - {media.category}</option>
                ))}
            </select>
          </label>
          <AmountInput label="Challenge amount" placeholder="Minimum 6.51 APT" />
          <div className="state_card">
            <span className="state_mark">Minimum challenge amount</span>
            <strong>6.51 APT</strong>
            <p>Cross-category challenge is blocked by contract rules and should also be blocked in the UI.</p>
          </div>
          <ActionButton>Confirm Mock Challenge</ActionButton>
        </div>
      </ModalShell>
    </div>
  );
}
