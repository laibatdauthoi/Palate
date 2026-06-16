import { VIDEO_ENABLED } from "@/config/app_config";
import type { MediaRecord } from "@/types/palate";
import { isMediaCategoryCompatible } from "./media_file_validation";

export type PushEligibility = {
  eligible: boolean;
  reason: string;
};

export type PushEligibilityOptions = {
  requireIdle?: boolean;
};

function getStorageLabel(media: MediaRecord) {
  const storageStatus = media.storageStatus ?? "uploaded";
  if (storageStatus === "shelby_upload_failed") return "Shelby upload failed media cannot be pushed.";
  if (storageStatus === "deleted") return "Deleted media cannot be pushed.";
  return null;
}

export function getPushEligibility(media: MediaRecord, options: PushEligibilityOptions = {}): PushEligibility {
  const requireIdle = options.requireIdle ?? true;

  if (media.source !== "palate") {
    return { eligible: false, reason: "Only Palate-registered media can be pushed." };
  }
  if (media.palateMediaId === null || media.palateMediaId === undefined) {
    return { eligible: false, reason: "Media must be registered on Palate first." };
  }
  if (media.deletePending) {
    return { eligible: false, reason: "Media is waiting for on-chain delete." };
  }
  if (media.contentUnavailable) {
    return { eligible: false, reason: "Shelby content is unavailable." };
  }
  if (media.shelbyCleanupRequired) {
    return { eligible: false, reason: "Shelby cleanup is required first." };
  }
  const storageLabel = getStorageLabel(media);
  if (storageLabel) {
    return { eligible: false, reason: storageLabel };
  }
  if (media.status === "pending_registration") {
    return { eligible: false, reason: "Media is still registering." };
  }
  if (media.status === "registration_failed") {
    return { eligible: false, reason: "Registration failed media cannot be pushed." };
  }
  if (requireIdle && media.status !== "idle") {
    return { eligible: false, reason: "Media must be idle to push." };
  }
  if (!isMediaCategoryCompatible(media.category, media.mimeType, media.originalFileName)) {
    return { eligible: false, reason: "This file type does not match its category." };
  }
  if (!VIDEO_ENABLED && media.category === "video") {
    return { eligible: false, reason: "Video media is disabled for MVP." };
  }

  return { eligible: true, reason: "Eligible for Push." };
}
