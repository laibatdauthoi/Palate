import { AccountAddress, Network } from "@aptos-labs/ts-sdk";
import type { InputGenerateTransactionPayloadData } from "@aptos-labs/ts-sdk";
import {
  createDefaultErasureCodingProvider,
  defaultErasureCodingConfig,
  expectedTotalChunksets,
  generateCommitments,
  ShelbyBlobClient,
  ShelbyRPCClient
} from "@shelby-protocol/sdk/browser";
import type { ShelbyClientConfig } from "@shelby-protocol/sdk/browser";
import { app_config } from "@/config/app_config";
import type { MediaRecord } from "@/types/palate";

export type ShelbyUploadMetadata = {
  title: string;
  category: string;
  mimeType: string;
  originalFileName: string;
};

export type ShelbyUploadResult = {
  shelbyBlobRef: string;
  contentHash: string;
  mimeType: string;
  size: number;
  originalFileName: string;
  blobName: string;
  displayUrl: string;
  shelbyRegistrationHash: string;
};

type ShelbyUploadOptions = {
  submitShelbyRegistration: (payload: InputGenerateTransactionPayloadData) => Promise<string>;
  waitForShelbyRegistration: (transactionHash: string) => Promise<unknown>;
};

export type PreparedShelbyUpload = {
  file: File;
  blobData: Uint8Array;
  ownerAddress: string;
  owner: AccountAddress;
  metadata: ShelbyUploadMetadata;
  blobName: string;
  contentHash: string;
  mimeType: string;
  size: number;
  originalFileName: string;
  displayUrl: string;
  registrationPayload: InputGenerateTransactionPayloadData;
};

export type RegisteredShelbyUpload = PreparedShelbyUpload & {
  shelbyRegistrationHash: string;
};

const SHELBY_RETENTION_MICROS = 30 * 24 * 60 * 60 * 1_000_000;

function requireShelbyConfigured() {
  if (!app_config.shelby.enabled || !app_config.shelby.apiKey) {
    throw new Error("Shelby API key is not configured.");
  }
}

function createShelbyConfig(): ShelbyClientConfig {
  return {
    network: Network.TESTNET,
    apiKey: app_config.shelby.apiKey,
    aptos: {
      network: Network.TESTNET,
      clientConfig: {
        API_KEY: app_config.shelby.apiKey
      }
    },
    rpc: {
      apiKey: app_config.shelby.apiKey
    },
    indexer: {
      apiKey: app_config.shelby.apiKey
    }
  };
}

function safeBlobName(fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : "bin";
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return `palate/${Date.now()}-${baseName || "media"}.${extension || "bin"}`;
}

function getShelbyDirectUrl(ownerAddress: string, blobName: string) {
  return `https://api.testnet.shelby.xyz/shelby/v1/blobs/${ownerAddress}/${blobName}`;
}

export async function prepareShelbyUpload(
  file: File,
  ownerAddress: string,
  metadata: ShelbyUploadMetadata
): Promise<PreparedShelbyUpload> {
  requireShelbyConfigured();

  const blobData = new Uint8Array(await file.arrayBuffer());
  const blobName = safeBlobName(metadata.originalFileName || file.name);
  const erasureConfig = defaultErasureCodingConfig();
  const erasureProvider = await createDefaultErasureCodingProvider();
  const commitments = await generateCommitments(erasureProvider, blobData);
  const expirationMicros = Date.now() * 1000 + SHELBY_RETENTION_MICROS;
  const owner = AccountAddress.fromString(ownerAddress);
  const registrationPayload = ShelbyBlobClient.createRegisterBlobPayload({
    account: owner,
    blobName,
    blobSize: blobData.length,
    blobMerkleRoot: commitments.blob_merkle_root,
    expirationMicros,
    numChunksets: expectedTotalChunksets(blobData.length, erasureConfig.chunkSizeBytes * erasureConfig.erasure_k),
    encoding: erasureConfig.enumIndex
  });

  return {
    file,
    blobData,
    ownerAddress,
    owner,
    metadata,
    blobName,
    contentHash: commitments.blob_merkle_root,
    mimeType: metadata.mimeType || file.type,
    size: file.size,
    originalFileName: metadata.originalFileName || file.name,
    displayUrl: getShelbyDirectUrl(ownerAddress, blobName),
    registrationPayload
  };
}

export async function registerShelbyBlob(preparedUpload: PreparedShelbyUpload, options: ShelbyUploadOptions): Promise<RegisteredShelbyUpload> {
  requireShelbyConfigured();

  const shelbyRegistrationHash = await options.submitShelbyRegistration(preparedUpload.registrationPayload);
  await options.waitForShelbyRegistration(shelbyRegistrationHash);

  return {
    ...preparedUpload,
    shelbyRegistrationHash
  };
}

export async function uploadPreparedBlobToShelby(registeredUpload: RegisteredShelbyUpload): Promise<ShelbyUploadResult> {
  requireShelbyConfigured();

  const shelbyConfig = createShelbyConfig();
  const rpcClient = new ShelbyRPCClient(shelbyConfig);
  await rpcClient.putBlob({
    account: registeredUpload.owner,
    blobName: registeredUpload.blobName,
    blobData: registeredUpload.blobData,
    totalBytes: registeredUpload.blobData.length
  });

  return getShelbyUploadResult(registeredUpload);
}

export async function uploadMediaToShelby(
  file: File,
  ownerAddress: string,
  metadata: ShelbyUploadMetadata,
  options: ShelbyUploadOptions
): Promise<ShelbyUploadResult> {
  const preparedUpload = await prepareShelbyUpload(file, ownerAddress, metadata);
  const registeredUpload = await registerShelbyBlob(preparedUpload, options);
  return uploadPreparedBlobToShelby(registeredUpload);
}

function getShelbyUploadResult(registeredUpload: RegisteredShelbyUpload): ShelbyUploadResult {
  return {
    shelbyBlobRef: registeredUpload.displayUrl,
    contentHash: registeredUpload.contentHash,
    mimeType: registeredUpload.mimeType,
    size: registeredUpload.size,
    originalFileName: registeredUpload.originalFileName,
    blobName: registeredUpload.blobName,
    displayUrl: registeredUpload.displayUrl,
    shelbyRegistrationHash: registeredUpload.shelbyRegistrationHash
  };
}

export function getShelbyDisplaySource(media: MediaRecord): string {
  return media.displayUrl || media.shelbyBlobRef;
}

export function getShelbyBlobNameFromRef(ownerAddress: string, shelbyBlobRef: string): string {
  const trimmed = shelbyBlobRef.trim();
  if (!trimmed) {
    throw new Error("Shelby blob reference is missing.");
  }

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return trimmed;
  }

  const url = new URL(trimmed);
  const marker = "/shelby/v1/blobs/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error("Shelby blob reference is not a recognized Shelby URL.");
  }

  const pathAfterMarker = url.pathname.slice(markerIndex + marker.length);
  const slashIndex = pathAfterMarker.indexOf("/");
  if (slashIndex < 0) {
    throw new Error("Shelby blob reference is missing a blob name.");
  }

  const refOwner = pathAfterMarker.slice(0, slashIndex).replace(/^0x/i, "").toLowerCase();
  const expectedOwner = ownerAddress.replace(/^0x/i, "").toLowerCase();
  if (refOwner !== expectedOwner) {
    throw new Error("Shelby blob reference owner does not match this media owner.");
  }

  return decodeURIComponent(pathAfterMarker.slice(slashIndex + 1));
}

export function buildShelbyDeleteBlobPayload(ownerAddress: string, shelbyBlobRef: string): InputGenerateTransactionPayloadData {
  requireShelbyConfigured();

  return ShelbyBlobClient.createDeleteBlobPayload({
    blobName: getShelbyBlobNameFromRef(ownerAddress, shelbyBlobRef)
  });
}

export const shelby_service_config = {
  network: app_config.shelby.network,
  enabled: app_config.shelby.enabled
} as const;
