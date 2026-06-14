"use client";

import { useMemo, useState } from "react";
import { ActionButton } from "@/components/action_button";
import { CustomDropdown, type DropdownOption } from "@/components/custom_dropdown";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { LoadingState } from "@/components/loading_state";
import { MediaCard } from "@/components/media_card";
import { ModalShell } from "@/components/modal_shell";
import { PageHeader } from "@/components/page_header";
import { SectionPanel } from "@/components/section_panel";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import type { MediaCategory, MediaStatus } from "@/types/palate";

const statuses = ["All", "Idle", "Waiting", "Active", "Settled", "Shelby Upload Failed", "Registration Failed", "Pending Registration"] as const;
const categories = ["All Categories", "Meme", "Image", "Audio", "Video"] as const;
type CategoryFilter = (typeof categories)[number];
const status_values = {
  Idle: "idle",
  Waiting: "waiting",
  Active: "active",
  Settled: "settled",
  "Registration Failed": "registration_failed",
  "Pending Registration": "pending_registration"
} as const satisfies Record<Exclude<(typeof statuses)[number], "All" | "Shelby Upload Failed">, MediaStatus>;
const category_values = {
  Meme: "meme",
  Image: "image",
  Audio: "audio",
  Video: "video"
} as const satisfies Record<Exclude<(typeof categories)[number], "All Categories">, MediaCategory>;

export default function MyMediaPage() {
  const { clearPendingRegistration, deleteFailedMedia, mediaReadStatus, mediaRecords, processingAction, retryPalateRegistration } = usePalate();
  const { walletStatus } = usePalateWallet();
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [category, setCategory] = useState<CategoryFilter>("All Categories");
  const [deleteMediaId, setDeleteMediaId] = useState<number | null>(null);
  const categoryOptions: DropdownOption<CategoryFilter>[] = categories.map((item) => ({ label: item, value: item }));
  const walletReady = walletStatus === "connected";

  const filteredMedia = useMemo(() => {
    return mediaRecords.filter((media) => {
      let statusMatches = status === "All";
      if (status === "Shelby Upload Failed") {
        statusMatches = media.storageStatus === "shelby_upload_failed";
      } else if (status !== "All") {
        statusMatches = media.status === status_values[status];
      }
      const categoryMatches = category === "All Categories" || media.category === category_values[category];
      return statusMatches && categoryMatches;
    });
  }, [category, mediaRecords, status]);
  const mediaToDelete = deleteMediaId === null ? null : mediaRecords.find((media) => media.id === deleteMediaId) ?? null;

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
              actionLabel={
                media.storageStatus === "shelby_upload_failed"
                  ? "Delete"
                  : media.status === "registration_failed"
                  ? "Retry registration"
                  : media.status === "pending_registration"
                    ? "Registering"
                    : media.status === "idle"
                      ? "Push"
                      : media.status === "waiting"
                        ? "Waiting"
                        : media.status === "active"
                          ? "View Match"
                          : "View Result"
              }
              actionDisabled={
                media.status === "pending_registration"
                  || processingAction === `retryRegistration:${media.id}`
                  || processingAction === `deleteFailedMedia:${media.id}`
              }
              onAction={
                media.storageStatus === "shelby_upload_failed"
                  ? () => setDeleteMediaId(media.id)
                  : media.status === "registration_failed"
                    ? () => retryPalateRegistration(media.id)
                    : undefined
              }
              secondaryActionLabel={media.source === "palate_upload_recovery" ? "Clear" : undefined}
              onSecondaryAction={media.source === "palate_upload_recovery" ? () => clearPendingRegistration(media.id) : undefined}
            />
          ))}
        </div>
      )}

      <ModalShell title="Delete failed media" open={deleteMediaId !== null} onClose={() => setDeleteMediaId(null)}>
        <div className="stack">
          <p className="secondary_text">
            Delete this failed Shelby upload from Palate. The app will try Shelby deletion first, then mark the Palate record deleted.
          </p>
          {mediaToDelete ? (
            <div className="state_card">
              <span className="state_mark">Failed media</span>
              <strong>{mediaToDelete.title}</strong>
              <p>Shelby registration succeeded, but file upload failed.</p>
            </div>
          ) : null}
          <div className="cluster">
            <ActionButton
              disabled={deleteMediaId === null || processingAction === `deleteFailedMedia:${deleteMediaId}`}
              onClick={async () => {
                if (deleteMediaId === null) return;
                await deleteFailedMedia(deleteMediaId);
                setDeleteMediaId(null);
              }}
              variant="danger"
            >
              {processingAction === `deleteFailedMedia:${deleteMediaId}` ? "Deleting" : "Delete"}
            </ActionButton>
            <ActionButton onClick={() => setDeleteMediaId(null)} variant="ghost">
              Cancel
            </ActionButton>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
