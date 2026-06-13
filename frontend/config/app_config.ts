import type { MediaCategory, MediaFormat } from "@/types/palate";

export const app_config = {
  appName: "Palate",
  networkLabel: "Aptos Testnet",
  moduleAddress: "0x0000000000000000000000000000000000000000000000000000000000000000",
  moduleName: "palate",
  acceptedUploadFormats: ["PNG", "JPG", "JPEG", "WEBP", "GIF"] as MediaFormat[],
  acceptedUploadMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"],
  supportedCategories: ["meme", "image"] as MediaCategory[],
  mockMode: true
} as const;

export const upload_step_labels = {
  preparing_file: "Preparing file",
  uploading_to_shelby: "Uploading to Shelby",
  registering_on_chain: "Registering on chain",
  completed: "Completed",
  failed: "Failed"
} as const;
