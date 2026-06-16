import type { MediaRecord } from "@/types/palate";

const placeholder_titles = new Set([
  "Palate",
  "Palate Image",
  "Palate Video",
  "Palate Audio",
  "Palate Media",
  "Audio Track",
  "Media Unavailable"
]);

function decodeSafe(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripQueryAndHash(value: string) {
  return value.split(/[?#]/, 1)[0] ?? value;
}

function looksLikeUrl(value: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.startsWith("/");
}

export function isPlaceholderMediaTitle(value?: string | null) {
  if (!value) return true;
  return placeholder_titles.has(value.trim());
}

export function extractBlobName(value?: string | null) {
  if (!value) return "";

  const rawValue = stripQueryAndHash(value.trim());
  if (!rawValue) return "";

  if (!looksLikeUrl(rawValue)) {
    return decodeSafe(rawValue);
  }

  const parsePath = (pathname: string) => {
    const pathSegments = pathname.split("/").filter(Boolean);
    const blobIndex = pathSegments.findIndex((segment) => segment === "blobs");
    if (blobIndex >= 0) {
      return pathSegments.slice(blobIndex + 2).map((segment) => decodeSafe(segment)).join("/");
    }
    return decodeSafe(pathSegments[pathSegments.length - 1] ?? "");
  };

  try {
    const parsed = new URL(rawValue);
    const blobPath = parsePath(parsed.pathname);
    if (blobPath) return blobPath;
  } catch {
    // Fall through to raw path parsing.
  }

  return parsePath(rawValue);
}

export function extractBlobFileName(value?: string | null) {
  const blobName = extractBlobName(value);
  if (!blobName) return "";
  const segments = blobName.split("/").filter(Boolean);
  return decodeSafe(segments[segments.length - 1] ?? blobName);
}

export function shortenMediaRef(value?: string | null) {
  if (!value) return "";
  const normalized = stripQueryAndHash(value.trim());
  if (!normalized) return "";
  if (normalized.length <= 28) return normalized;
  return `${normalized.slice(0, 16)}...${normalized.slice(-8)}`;
}

export function getMediaDisplayTitle(media: Pick<MediaRecord, "title" | "originalFileName" | "shelbyBlobRef" | "displayUrl">) {
  const userTitle = media.title?.trim();
  if (userTitle && !isPlaceholderMediaTitle(userTitle)) {
    return userTitle;
  }

  const originalName = media.originalFileName?.trim();
  if (originalName && !isPlaceholderMediaTitle(originalName)) {
    return originalName;
  }

  const blobFileName = extractBlobFileName(media.displayUrl) || extractBlobFileName(media.shelbyBlobRef);
  if (blobFileName) {
    return blobFileName;
  }

  const blobName = extractBlobName(media.displayUrl) || extractBlobName(media.shelbyBlobRef);
  if (blobName) {
    return blobName;
  }

  const shortenedRef = shortenMediaRef(media.shelbyBlobRef ?? media.displayUrl);
  if (shortenedRef) {
    return shortenedRef;
  }

  return "Untitled media";
}
