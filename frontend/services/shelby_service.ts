import type { MediaRecord } from "@/types/palate";

export type ShelbyUploadDraft = {
  file: File;
  blobName: string;
};

export type ShelbyUploadResult = {
  shelbyBlobRef: string;
  contentHash: string;
  mimeType: string;
};

function notImplemented(functionName: string): never {
  throw new Error(`${functionName} is not implemented. Future work must use official Shelby upload/read flows and must not invent a replacement storage layer.`);
}

// Future Shelby upload boundary: encode file, register Shelby blob, then upload file bytes to Shelby RPC.
export async function uploadMediaToShelby(_draft: ShelbyUploadDraft): Promise<ShelbyUploadResult> {
  void _draft;
  notImplemented("uploadMediaToShelby");
}

// Future Shelby display boundary: derive a supported Shelby read URL or SDK source from contract media metadata.
export function getShelbyDisplaySource(_media: MediaRecord): string {
  void _media;
  notImplemented("getShelbyDisplaySource");
}
