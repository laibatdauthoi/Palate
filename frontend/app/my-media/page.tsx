"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/action_button";
import { CustomDropdown, type DropdownOption } from "@/components/custom_dropdown";
import { EmptyState } from "@/components/empty_state";
import { ErrorState } from "@/components/error_state";
import { FilterBar, FilterTabs } from "@/components/filter_bar";
import { LoadingState } from "@/components/loading_state";
import { MediaCard } from "@/components/media_card";
import { ModalShell } from "@/components/modal_shell";
import { PageHeader } from "@/components/page_header";
import { useMediaPlayer } from "@/providers/media_player_provider";
import { usePalate } from "@/providers/palate_provider";
import { usePalateWallet } from "@/providers/wallet_provider";
import type { MediaCategory, MediaRecord, MediaStatus } from "@/types/palate";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { getPushEligibility } from "@/utils/push_eligibility";
import { isMediaCategoryCompatible } from "@/utils/media_file_validation";
import { app_config } from "@/config/app_config";
import { logPageMount, startRouteTransition } from "@/utils/ui_perf";

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
  const { clearPendingRegistration, deleteMedia, expireWaitingPush, feedback, mediaReadStatus, mediaRecords, processingAction, readLifecycle, retryOnChainDelete, retryPalateRegistration } = usePalate();
  const { canPlayMedia, currentTrackId, isPlaying, playMedia, setQueueFromMedia, togglePlayback } = useMediaPlayer();
  const { walletStatus } = usePalateWallet();
  const router = useRouter();
  const [status, setStatus] = useState<(typeof statuses)[number]>("All");
  const [category, setCategory] = useState<CategoryFilter>("All Categories");
  const [deleteMediaId, setDeleteMediaId] = useState<number | null>(null);
  const categoryOptions: DropdownOption<CategoryFilter>[] = categories.map((item) => ({ label: item, value: item }));
  const walletReady = walletStatus === "connected";
  const cleanupFeedback = feedback?.scope === "cleanup" ? feedback : null;

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
  const deleteDisplayTitle = mediaToDelete ? getMediaDisplayTitle(mediaToDelete) : "";

  useEffect(() => {
    logPageMount("My Media");
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const callbackId = window.requestIdleCallback(() => {
        setQueueFromMedia(filteredMedia);
      });

      return () => window.cancelIdleCallback(callbackId);
    }

    const timer = setTimeout(() => {
      setQueueFromMedia(filteredMedia);
    }, 0);

    return () => clearTimeout(timer);
  }, [filteredMedia, setQueueFromMedia]);

  useEffect(() => {
    if (!app_config.debugUiPerf) return;
    filteredMedia.forEach((media) => {
      const eligibility = getPushEligibility(media);
      console.debug("[Palate Push eligibility debug]", {
        mediaId: media.id,
        title: getMediaDisplayTitle(media),
        status: media.status,
        storageStatus: media.storageStatus ?? "uploaded",
        category: media.category,
        reason: eligibility.reason
      });
    });
  }, [filteredMedia]);

  function renderMediaCard(media: MediaRecord) {
    const isInvalid = media.source === "palate" && !isMediaCategoryCompatible(media.category, media.mimeType, media.originalFileName);
    const canCleanUpExpiredPush = media.source === "palate"
      && media.status === "waiting"
      && media.waitingPushExpired === true
      && typeof media.waitingPushId === "number";
    const waitingPushIdUnavailable = media.source === "palate"
      && media.status === "waiting"
      && media.waitingPushExpired === true
      && typeof media.waitingPushId !== "number";
    const waitingExpiryUnavailable = media.source === "palate"
      && media.status === "waiting"
      && media.waitingPushExpired !== true
      && (typeof media.waitingPushId !== "number" || typeof media.waitingPushExpired !== "boolean");
    const pushEligibility = (media.status === "idle" || media.status === "settled" || canCleanUpExpiredPush)
      ? getPushEligibility(media, { allowExpiredWaitingPush: true })
      : null;
    const canPush = pushEligibility ? pushEligibility.eligible : false;
    const isDeletable = media.source === "palate"
      && media.palateMediaId !== null
      && media.palateMediaId !== undefined
      && (media.storageStatus === "shelby_upload_failed" || media.status === "idle");
    const primaryDelete = !media.deletePending && (media.storageStatus === "shelby_upload_failed" || media.contentUnavailable || media.shelbyCleanupRequired || (isInvalid && isDeletable));

    return (
        <MediaCard
        key={media.id}
        media={media}
          mediaActive={currentTrackId === media.id}
          mediaPlaying={currentTrackId === media.id && isPlaying}
          actionLabel={
            media.shelbyCleanupRequired
              ? "Retry Shelby delete"
              : media.deletePending
              ? "Retry on-chain delete"
              : primaryDelete
              ? "Delete"
                : media.status === "registration_failed"
                ? "Retry registration"
                : media.status === "pending_registration"
                ? "Registering"
                : canPush
                  ? "Push"
                : canCleanUpExpiredPush
                  ? "Clean up expired push"
                : media.status === "waiting"
                    ? "Waiting"
                    : media.status === "active"
                      ? "View Match"
                      : "View Result"
          }
          actionDisabled={
            media.status === "pending_registration"
            || processingAction === `retryRegistration:${media.id}`
            || processingAction === `deleteMedia:${media.id}`
            || processingAction === `retryDelete:${media.id}`
            || processingAction === "createPush"
            || waitingPushIdUnavailable
            || (canCleanUpExpiredPush && processingAction === `expireWaitingPush:${media.waitingPushId}`)
            || (media.status === "waiting" && !canCleanUpExpiredPush && !canPush)
            || ((media.status === "idle" || media.status === "settled" || canCleanUpExpiredPush) && !canPush && !canCleanUpExpiredPush)
          }
          onAction={
            media.shelbyCleanupRequired
              ? () => deleteMedia(media.id)
              : media.deletePending
              ? () => retryOnChainDelete(media.id)
              : primaryDelete
              ? () => setDeleteMediaId(media.id)
              : media.status === "registration_failed"
              ? () => retryPalateRegistration(media.id)
              : canPush
                ? () => {
                  startRouteTransition("my-media-card", "/push", "router.push");
                  router.push(`/push?mediaId=${media.id}`);
                }
              : canCleanUpExpiredPush
                ? () => expireWaitingPush(media.waitingPushId!)
                : media.status === "settled"
                  ? () => {
                    startRouteTransition("my-media-card", "/profile", "router.push");
                    router.push("/profile?tab=Claims");
                  }
                : undefined
          }
        secondaryActionLabel={
          media.source === "palate_upload_recovery"
            ? "Clear"
            : canCleanUpExpiredPush && canPush
              ? "Clean up expired push"
              : isDeletable && !primaryDelete && !media.deletePending
                ? "Delete"
                : undefined
        }
        onSecondaryAction={
          media.source === "palate_upload_recovery"
            ? () => clearPendingRegistration(media.id)
            : canCleanUpExpiredPush && canPush
              ? () => expireWaitingPush(media.waitingPushId!)
              : isDeletable && !primaryDelete && !media.deletePending
                ? () => setDeleteMediaId(media.id)
                : undefined
        }
        onMediaToggle={
          canPlayMedia(media)
            ? () => {
              if (currentTrackId === media.id) {
                togglePlayback();
              } else {
                playMedia(media);
              }
            }
            : undefined
        }
        onPushAction={canPush ? () => {
          startRouteTransition("my-media-card", "/push", "router.push");
          router.push(`/push?mediaId=${media.id}`);
        } : undefined}
        waitingExpiryUnavailable={waitingExpiryUnavailable}
        waitingPushIdUnavailable={waitingPushIdUnavailable}
      />
    );
  }

  return (
    <div className="page_stack page_media">
      <PageHeader
        eyebrow="Inventory"
        title="My Media"
        copy="Registered media appears here after Shelby upload and on-chain registration."
        actions={<ActionButton href="/my-media/upload">Upload Media</ActionButton>}
        className="page_header_floating page_header_stacked"
      />

      <FilterBar ariaLabel="Media filters">
        <FilterTabs
          activeKey={status}
          ariaLabel="Status filters"
          items={statuses.map((item) => ({ key: item, label: item }))}
          onChange={setStatus}
        />
          <CustomDropdown label="Category" onChange={setCategory} options={categoryOptions} value={category} />
      </FilterBar>
      {!walletReady ? <p className="feedback_text feedback_info">Connect wallet to load your on-chain media.</p> : null}
      {cleanupFeedback ? <p className={`feedback_text feedback_${cleanupFeedback.type}`}>{cleanupFeedback.message}</p> : null}

      {walletReady && mediaReadStatus === "loading" && !readLifecycle.hasLoadedMedia ? <LoadingState className="full_width_state" label="Loading on-chain media" /> : null}
      {walletReady && mediaReadStatus === "error" ? <ErrorState className="full_width_state" title="Media read failed" copy="Local inventory remains available while the chain read is retried later." /> : null}
      {filteredMedia.length === 0 && !(mediaReadStatus === "loading" && !readLifecycle.hasLoadedMedia) ? (
        <EmptyState className="full_width_state" title="No media found" copy="Upload and register media to start building your Palate inventory." actionLabel="Upload Media" actionHref="/my-media/upload" />
      ) : (
        <div className="media_grid">
          {filteredMedia.map((media) => renderMediaCard(media))}
        </div>
      )}

      <ModalShell title="Delete media" open={deleteMediaId !== null} onClose={() => setDeleteMediaId(null)}>
        <div className="stack">
          <p className="secondary_text">
            Delete this media from Palate. The app will try Shelby deletion first, then mark the Palate record deleted.
          </p>
          {mediaToDelete ? (
            <div className="state_card">
              <span className="state_mark">{mediaToDelete.storageStatus === "shelby_upload_failed" ? "Failed media" : "Media"}</span>
              <strong>{deleteDisplayTitle}</strong>
              <p>{mediaToDelete.storageStatus === "shelby_upload_failed" ? "Shelby registration succeeded, but file upload failed." : "This idle media will be hidden from My Media and cannot be used in gameplay."}</p>
            </div>
          ) : null}
          <div className="cluster">
            <ActionButton
              disabled={deleteMediaId === null || processingAction === `deleteMedia:${deleteMediaId}`}
              onClick={async () => {
                if (deleteMediaId === null) return;
                await deleteMedia(deleteMediaId);
                setDeleteMediaId(null);
              }}
              variant="danger"
            >
              {processingAction === `deleteMedia:${deleteMediaId}` ? "Deleting" : "Delete"}
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
