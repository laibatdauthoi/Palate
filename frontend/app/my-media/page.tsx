"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { CustomDropdown, type DropdownOption } from "@/components/custom_dropdown";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { LoadingState } from "@/components/loading_state";
import { MediaCard } from "@/components/media_card";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import type { MediaCategory, MediaStatus } from "@/types/palate";

const statuses = ["All", "Idle", "Waiting", "Active", "Settled"] as const;
const categories = ["All Categories", "Meme", "Image", "Audio", "Video"] as const;
type CategoryFilter = (typeof categories)[number];
const status_values = {
  Idle: "idle",
  Waiting: "waiting",
  Active: "active",
  Settled: "settled"
} as const satisfies Record<Exclude<(typeof statuses)[number], "All">, MediaStatus>;
const category_values = {
  Meme: "meme",
  Image: "image",
  Audio: "audio",
  Video: "video"
} as const satisfies Record<Exclude<(typeof categories)[number], "All Categories">, MediaCategory>;

export default function MyMediaPage() {
  const { mediaReadStatus, mediaRecords } = usePalate();
  const { walletStatus } = usePalateWallet();
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [category, setCategory] = useState<CategoryFilter>("All Categories");
  const categoryOptions: DropdownOption<CategoryFilter>[] = categories.map((item) => ({ label: item, value: item }));
  const walletReady = walletStatus === "connected";

  const filteredMedia = useMemo(() => {
    return mediaRecords.filter((media) => {
      const statusMatches = status === "All" || media.status === status_values[status];
      const categoryMatches = category === "All Categories" || media.category === category_values[category];
      return statusMatches && categoryMatches;
    });
  }, [category, mediaRecords, status]);

  return (
    <div className="page_stack page_media">
      <PageHeader
        eyebrow="Inventory"
        title="My Media"
        copy="Registered media appears here after Shelby upload and on-chain registration."
        actions={<ActionButton href="/my-media/upload">Upload Media</ActionButton>}
      />

      <SectionPanel>
        <div className="filter_bar">
          <div className="tabs" aria-label="Status filters">
            {statuses.map((item) => (
              <button className={`tab_button ${status === item ? "active" : ""}`} key={item} onClick={() => setStatus(item)}>
                {item}
              </button>
            ))}
          </div>
          <CustomDropdown label="Category" onChange={setCategory} options={categoryOptions} value={category} />
        </div>
        {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to load your on-chain media.</p> : null}
      </SectionPanel>

      {walletReady && mediaReadStatus === "loading" ? <LoadingState label="Loading on-chain media" /> : null}
      {walletReady && mediaReadStatus === "error" ? <ErrorState title="Media read failed" copy="Local inventory remains available while the chain read is retried later." /> : null}
      {filteredMedia.length === 0 && mediaReadStatus !== "loading" ? (
        <EmptyState title="No media found" copy="Upload and register media to start building your Palate inventory." actionLabel="Upload Media" actionHref="/my-media/upload" />
      ) : (
        <div className="media_grid">
          {filteredMedia.map((media) => (
            <MediaCard
              key={media.id}
              media={media}
              actionLabel={media.status === "idle" ? "Push" : media.status === "waiting" ? "Waiting" : media.status === "active" ? "View Match" : "View Result"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
