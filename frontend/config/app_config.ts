import type { MediaCategory, MediaFormat } from "@/types/palate";

export const app_config = {
  appName: "Palate",
  networkLabel: "Aptos Testnet",
  moduleAddress: "0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f",
  moduleName: "palate",
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
  preparing_file: "Preparing file",
  uploading_to_shelby: "Uploading to Shelby",
  registering_on_chain: "Registering on chain",
  completed: "Completed",
  failed: "Failed"
} as const;
