import type { MediaCategory, MediaFormat } from "@/types/palate";

export const VIDEO_ENABLED = false;

export const app_config = {
  appName: "Palate",
  networkLabel: "Aptos Testnet",
  aptosFullnodeUrl: process.env.NEXT_PUBLIC_APTOS_FULLNODE_URL?.trim() || "https://api.testnet.aptoslabs.com/v1",
  moduleAddress: "0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f",
  moduleName: "palate",
  debugAptosReads: process.env.NEXT_PUBLIC_DEBUG_APTOS_READS === "true",
  shelby: {
    network: "testnet",
    apiKey: process.env.NEXT_PUBLIC_SHELBY_API_KEY ?? "",
    enabled: Boolean(process.env.NEXT_PUBLIC_SHELBY_API_KEY)
  },
  acceptedUploadFormats: ["PNG", "JPG", "JPEG", "WEBP", "GIF", "MP3", "WAV", "OGG", "M4A", "MP4", "WEBM", "MOV"] as MediaFormat[],
  acceptedUploadMimeTypes: [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp4",
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ],
  supportedCategories: ["meme", "image", "audio", "video"] as MediaCategory[],
  mockMode: true
} as const;

export const upload_step_labels = {
  idle: "Ready",
  preparing_file: "Preparing file",
  generating_commitments: "Generating commitments",
  registering_shelby_blob: "Registering Shelby blob",
  uploading_to_shelby: "Uploading to Shelby",
  shelby_upload_failed: "Shelby upload failed",
  shelby_uploaded: "Shelby uploaded",
  registering_palate_media: "Registering in Palate",
  completed: "Completed",
  failed: "Failed"
} as const;
