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

export async function uploadMediaToShelby(
  file: File,
  ownerAddress: string,
  metadata: ShelbyUploadMetadata,
  options: ShelbyUploadOptions
): Promise<ShelbyUploadResult> {
  requireShelbyConfigured();

  const blobData = new Uint8Array(await file.arrayBuffer());
  const blobName = safeBlobName(metadata.originalFileName || file.name);
  const shelbyConfig = createShelbyConfig();
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

  const shelbyRegistrationHash = await options.submitShelbyRegistration(registrationPayload);
  await options.waitForShelbyRegistration(shelbyRegistrationHash);

  const rpcClient = new ShelbyRPCClient(shelbyConfig);
  await rpcClient.putBlob({
    account: owner,
    blobName,
    blobData,
    totalBytes: blobData.length
  });

  const displayUrl = getShelbyDirectUrl(ownerAddress, blobName);

  return {
    shelbyBlobRef: displayUrl,
    contentHash: commitments.blob_merkle_root,
    mimeType: metadata.mimeType || file.type,
    size: file.size,
    originalFileName: metadata.originalFileName || file.name,
    blobName,
    displayUrl,
    shelbyRegistrationHash
  };
}

export function getShelbyDisplaySource(media: MediaRecord): string {
  return media.shelbyBlobRef;
}

export const shelby_service_config = {
  network: app_config.shelby.network,
  enabled: app_config.shelby.enabled
} as const;
