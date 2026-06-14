import type { MediaCategory, MediaFormat } from "@/types/palate";

export type MediaKind = "image" | "audio" | "video" | "unknown";

const image_extensions = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const audio_extensions = new Set(["mp3", "wav", "ogg", "m4a"]);
const video_extensions = new Set(["mp4", "webm", "mov"]);

export const format_kind_map: Record<MediaFormat, MediaKind> = {
  PNG: "image",
  JPG: "image",
  JPEG: "image",
  WEBP: "image",
  GIF: "image",
  MP3: "audio",
  WAV: "audio",
  OGG: "audio",
  M4A: "audio",
  MP4: "video",
  WEBM: "video",
  MOV: "video"
};

export const category_kind_map: Record<MediaCategory, MediaKind> = {
  meme: "image",
  image: "image",
  audio: "audio",
  video: "video"
};

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() ?? "" : "";
}

function detectMediaKindFromMimeAndName(mimeType: string | null | undefined, fileName: string | null | undefined): MediaKind {
  const normalizedMimeType = (mimeType ?? "").toLowerCase();
  if (normalizedMimeType.startsWith("image/")) return "image";
  if (normalizedMimeType.startsWith("audio/")) return "audio";
  if (normalizedMimeType.startsWith("video/")) return "video";

  const extension = getExtension(fileName ?? "");
  if (image_extensions.has(extension)) return "image";
  if (audio_extensions.has(extension)) return "audio";
  if (video_extensions.has(extension)) return "video";
  return "unknown";
}

export function detectMediaKindFromFile(file: File | null): MediaKind {
  if (!file) return "unknown";
  return detectMediaKindFromMimeAndName(file.type, file.name);
}

export function detectFormatFromFile(file: File | null): MediaFormat | null {
  if (!file) return null;
  const extension = getExtension(file.name).toUpperCase();
  return Object.keys(format_kind_map).includes(extension) ? (extension as MediaFormat) : null;
}

export function getAllowedCategoriesForKind(kind: MediaKind): MediaCategory[] {
  if (kind === "image") return ["meme", "image"];
  if (kind === "audio") return ["audio"];
  if (kind === "video") return ["video"];
  return ["meme", "image", "audio", "video"];
}

export function getAllowedFormatsForKind(kind: MediaKind): MediaFormat[] {
  return (Object.entries(format_kind_map) as Array<[MediaFormat, MediaKind]>)
    .filter(([, candidateKind]) => kind === "unknown" || candidateKind === kind)
    .map(([format]) => format);
}

export function isCategoryCompatibleWithKind(category: MediaCategory, kind: MediaKind) {
  return kind !== "unknown" && category_kind_map[category] === kind;
}

export function detectMediaKindFromMetadata(mimeType: string | null | undefined, originalFileName: string | null | undefined) {
  return detectMediaKindFromMimeAndName(mimeType, originalFileName);
}

export function isMediaCategoryCompatible(
  category: MediaCategory,
  mimeType: string | null | undefined,
  originalFileName: string | null | undefined
) {
  return isCategoryCompatibleWithKind(category, detectMediaKindFromMetadata(mimeType, originalFileName));
}

export function getFileCategoryMessage(file: File | null, category: MediaCategory) {
  const kind = detectMediaKindFromFile(file);
  if (!file) return null;

  const extension = getExtension(file.name).toUpperCase() || "Selected";
  if (kind === "unknown") return "Choose a supported image, audio, or video file.";
  if (isCategoryCompatibleWithKind(category, kind)) return null;
  if (kind === "audio") return `${extension} files can only be uploaded as Audio.`;
  if (kind === "video") return `${extension} files can only be uploaded as Video.`;
  if (category === "audio") return `${extension} files cannot be uploaded as Audio.`;
  if (category === "video") return `${extension} files cannot be uploaded as Video.`;
  return "Meme uploads must be image or GIF files.";
}
