import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import type { InputGenerateTransactionPayloadData, SimpleEntryFunctionArgumentTypes } from "@aptos-labs/ts-sdk";
import { app_config } from "@/config/app_config";
import type {
  ActiveMatch,
  BuffAssignment,
  ChainCategoryConstants,
  ChainProtocolConfig,
  ClaimRecord,
  MediaCategory,
  MediaFormat,
  MediaRecord,
  MediaStatus,
  PalateBalance,
  UserSummary,
  WaitingPush
} from "@/types/palate";

const aptos_config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(aptos_config);
const OCTAS_PER_APT = BigInt(100000000);

const module_id = `${app_config.moduleAddress}::${app_config.moduleName}`;

function notImplemented(functionName: string): never {
  throw new Error(`${functionName} is not implemented. Future work should use Aptos ${app_config.networkLabel} view calls or signed entry-function transactions.`);
}

function viewFunction(functionName: string) {
  return `${module_id}::${functionName}` as `${string}::${string}::${string}`;
}

async function viewOne<T>(functionName: string, functionArguments: SimpleEntryFunctionArgumentTypes[] = []): Promise<T> {
  const result = await aptos.view<[T]>({
    payload: {
      function: viewFunction(functionName),
      typeArguments: [],
      functionArguments
    }
  });

  return result[0];
}

function asString(value: unknown) {
  return String(value);
}

function asNumber(value: unknown) {
  return Number(value);
}

function encodeUtf8(value: string): SimpleEntryFunctionArgumentTypes {
  return new TextEncoder().encode(value);
}

function decodeUtf8(value: unknown) {
  if (Array.isArray(value)) {
    return new TextDecoder().decode(new Uint8Array(value.map((item) => Number(item))));
  }

  if (typeof value === "string") {
    if (value.startsWith("0x")) {
      const hex = value.slice(2);
      const bytes = hex.match(/.{1,2}/g)?.map((chunk) => Number.parseInt(chunk, 16)) ?? [];
      return new TextDecoder().decode(new Uint8Array(bytes));
    }

    return value;
  }

  return String(value ?? "");
}

function categoryToChainValue(category: MediaCategory, constants?: ChainCategoryConstants | null) {
  const fallback: ChainCategoryConstants = { meme: 1, image: 2, audio: 3, video: 4 };
  return constants?.[category] ?? fallback[category];
}

function chainCategoryToFrontend(category: number): MediaCategory {
  if (category === 1) return "meme";
  if (category === 2) return "image";
  if (category === 3) return "audio";
  if (category === 4) return "video";
  return "image";
}

function chainStatusToFrontend(status: number): MediaStatus {
  if (status === 1) return "idle";
  if (status === 2) return "waiting";
  if (status === 3) return "active";
  if (status === 4) return "settled";
  if (status === 5) return "disabled";
  if (status === 6) return "banned";
  return "idle";
}

function chainWaitingPushStatusToFrontend(status: number): WaitingPush["status"] {
  if (status === 1) return "open";
  if (status === 2) return "cancelled";
  if (status === 3) return "challenged";
  return "open";
}

function chainMatchStatusToFrontend(status: number): ActiveMatch["status"] {
  if (status === 2) return "settled";
  return "active";
}

function mimeTypeToFormat(mimeType: string): MediaFormat {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes("png")) return "PNG";
  if (normalized.includes("webp")) return "WEBP";
  if (normalized.includes("gif")) return "GIF";
  if (normalized.includes("mpeg")) return "MP3";
  if (normalized.includes("wav")) return "WAV";
  if (normalized.includes("ogg")) return "OGG";
  if (normalized.includes("audio/mp4")) return "M4A";
  if (normalized.includes("video/mp4")) return "MP4";
  if (normalized.includes("webm")) return "WEBM";
  if (normalized.includes("quicktime")) return "MOV";
  return "JPG";
}

function accentForCategory(category: MediaCategory): MediaRecord["accent"] {
  if (category === "meme") return "pink";
  if (category === "image") return "rose";
  if (category === "audio") return "deep";
  return "purple";
}

function formatChainTime(createdTime: string) {
  const seconds = Number(createdTime);
  if (!Number.isFinite(seconds) || seconds <= 0) return "On chain";
  const millis = seconds > 9999999999 ? seconds : seconds * 1000;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(millis));
}

function formatTimeRemaining(endTime: string) {
  const endSeconds = Number(endTime);
  if (!Number.isFinite(endSeconds) || endSeconds <= 0) return "On chain";

  const remainingSeconds = Math.max(0, endSeconds - Math.floor(Date.now() / 1000));
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function parseAptToOctas(amount: string, options: { allowZero?: boolean } = {}): string {
  const normalized = amount.replace(/apt/gi, "").trim();
  if (!/^\d+(\.\d{0,8})?$/.test(normalized)) {
    throw new Error("Enter a valid APT amount with up to 8 decimal places.");
  }

  const [wholePart, decimalPart = ""] = normalized.split(".");
  const wholeOctas = BigInt(wholePart || "0") * OCTAS_PER_APT;
  const decimalOctas = BigInt(decimalPart.padEnd(8, "0") || "0");
  const total = wholeOctas + decimalOctas;

  if (!options.allowZero && total <= BigInt(0)) {
    throw new Error("Enter an amount greater than 0 APT.");
  }

  return total.toString();
}

export function formatOctasToApt(octas: string | number | bigint): string {
  const value = BigInt(octas);
  const whole = value / OCTAS_PER_APT;
  const fractional = value % OCTAS_PER_APT;
  const fractionalText = fractional.toString().padStart(8, "0").replace(/0+$/, "");

  return `${whole.toString()}${fractionalText ? `.${fractionalText}` : ""} APT`;
}

export function shortenTransactionHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export function getReadablePalateError(error: unknown, fallback = "Transaction failed.") {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const normalized = rawMessage.toLowerCase();

  if (rawMessage.includes("E_PUSH_AMOUNT_TOO_LOW") || normalized.includes("abort_code: 8") || normalized.includes("abort code: 8") || normalized.includes("code: 8")) {
    return "Push amount is below the minimum.";
  }
  if (rawMessage.includes("E_CHALLENGE_AMOUNT_TOO_LOW") || normalized.includes("abort_code: 13") || normalized.includes("abort code: 13") || normalized.includes("code: 13")) {
    return "Challenge amount is below the required minimum.";
  }
  if (rawMessage.includes("E_BUFF_AMOUNT_TOO_LOW") || normalized.includes("abort_code: 20") || normalized.includes("abort code: 20") || normalized.includes("code: 20")) {
    return "Buff amount is below the minimum.";
  }
  if (rawMessage.includes("E_CATEGORY_MISMATCH") || normalized.includes("abort_code: 12") || normalized.includes("abort code: 12") || normalized.includes("code: 12")) {
    return "Media categories must match.";
  }
  if (rawMessage.includes("E_INSUFFICIENT_AVAILABLE_BALANCE") || normalized.includes("abort_code: 31") || normalized.includes("abort code: 31") || normalized.includes("code: 31") || normalized.includes("insufficient")) {
    return "Not enough Palate Balance.";
  }

  return rawMessage || fallback;
}

export const aptos_service_config = {
  networkLabel: app_config.networkLabel,
  moduleAddress: app_config.moduleAddress,
  moduleName: app_config.moduleName,
  moduleId: module_id
} as const;

export async function categoryMeme(): Promise<number> {
  return asNumber(await viewOne("categoryMeme"));
}

export async function categoryImage(): Promise<number> {
  return asNumber(await viewOne("categoryImage"));
}

export async function categoryAudio(): Promise<number> {
  return asNumber(await viewOne("categoryAudio"));
}

export async function categoryVideo(): Promise<number> {
  return asNumber(await viewOne("categoryVideo"));
}

export async function getCategoryConstants(): Promise<ChainCategoryConstants> {
  const [meme, image, audio, video] = await Promise.all([
    categoryMeme(),
    categoryImage(),
    categoryAudio(),
    categoryVideo()
  ]);

  return { meme, image, audio, video };
}

export async function getTreasuryAddress(): Promise<string> {
  return asString(await viewOne("getTreasuryAddress"));
}

export async function getProtocolConfig(): Promise<ChainProtocolConfig> {
  const [
    protocolFeeBps,
    minPushAmount,
    minBuffAmount,
    minPushIncrementBps,
    matchDurationSeconds,
    buffCommitmentAmount,
    skipPenaltyAmount,
    randomRetryCount,
    scoreAlgorithmType,
    scoreScale,
    scoreLogBase,
    treasuryAddress,
    adminAddress
  ] = await Promise.all([
    viewOne("getProtocolFeeBps"),
    viewOne("getMinPushAmount"),
    viewOne("getMinBuffAmount"),
    viewOne("getMinPushIncrementBps"),
    viewOne("getMatchDurationSeconds"),
    viewOne("getBuffCommitmentAmount"),
    viewOne("getSkipPenaltyAmount"),
    viewOne("getRandomRetryCount"),
    viewOne("getScoreAlgorithmType"),
    viewOne("getScoreScale"),
    viewOne("getScoreLogBase"),
    viewOne("getTreasuryAddress"),
    viewOne("getAdminAddress")
  ]);

  return {
    protocolFeeBps: asString(protocolFeeBps),
    minPushAmount: asString(minPushAmount),
    minBuffAmount: asString(minBuffAmount),
    minPushIncrementBps: asString(minPushIncrementBps),
    matchDurationSeconds: asString(matchDurationSeconds),
    buffCommitmentAmount: asString(buffCommitmentAmount),
    skipPenaltyAmount: asString(skipPenaltyAmount),
    randomRetryCount: asString(randomRetryCount),
    scoreAlgorithmType: asNumber(scoreAlgorithmType),
    scoreScale: asString(scoreScale),
    scoreLogBase: asString(scoreLogBase),
    treasuryAddress: asString(treasuryAddress),
    adminAddress: asString(adminAddress)
  };
}

function entryPayload(functionName: string, functionArguments: SimpleEntryFunctionArgumentTypes[]): InputGenerateTransactionPayloadData {
  return {
    function: viewFunction(functionName),
    typeArguments: [],
    functionArguments
  };
}

export function buildDepositBalancePayload(amountOctas: string): InputGenerateTransactionPayloadData {
  return entryPayload("depositBalance", [amountOctas]);
}

export function buildWithdrawBalancePayload(amountOctas: string): InputGenerateTransactionPayloadData {
  return entryPayload("withdrawBalance", [amountOctas]);
}

export function buildCreatePushPayload(mediaId: number | string, pushAmountOctas: string): InputGenerateTransactionPayloadData {
  return entryPayload("createPush", [String(mediaId), pushAmountOctas]);
}

export function buildChallengePushPayload(pushId: number | string, challengerMediaId: number | string, pushAmountOctas: string): InputGenerateTransactionPayloadData {
  return entryPayload("challengePush", [String(pushId), String(challengerMediaId), pushAmountOctas]);
}

export type RegisterMediaInput = {
  category: MediaCategory;
  shelbyBlobRef: string;
  contentHash: string;
  mimeType: string;
  title: string;
  createdTime: string;
  categoryConstants?: ChainCategoryConstants | null;
};

export function buildRegisterMediaPayload(input: RegisterMediaInput): InputGenerateTransactionPayloadData {
  return entryPayload("registerMedia", [
    categoryToChainValue(input.category, input.categoryConstants),
    encodeUtf8(input.shelbyBlobRef),
    encodeUtf8(input.contentHash),
    encodeUtf8(input.mimeType),
    encodeUtf8(input.title),
    input.createdTime
  ]);
}

export async function waitForPalateTransaction(transactionHash: string) {
  return aptos.waitForTransaction({
    transactionHash,
    options: {
      checkSuccess: true
    }
  });
}

export async function getChainReadSnapshot() {
  const [categories, protocolConfig] = await Promise.all([
    getCategoryConstants(),
    getProtocolConfig()
  ]);

  return {
    categories,
    treasuryAddress: protocolConfig.treasuryAddress,
    protocolConfig
  };
}

async function getMediaRecordById(mediaId: string): Promise<MediaRecord> {
  const [
    ownerAddress,
    category,
    shelbyBlobRef,
    contentHash,
    mimeType,
    title,
    createdTime,
    status
  ] = await Promise.all([
    viewOne("getMediaOwner", [mediaId]),
    viewOne("getMediaCategory", [mediaId]),
    viewOne("getMediaShelbyBlobRef", [mediaId]),
    viewOne("getMediaContentHash", [mediaId]),
    viewOne("getMediaMimeType", [mediaId]),
    viewOne("getMediaTitle", [mediaId]),
    viewOne("getMediaCreatedTime", [mediaId]),
    viewOne("getMediaStatus", [mediaId])
  ]);

  const mediaCategory = chainCategoryToFrontend(asNumber(category));
  const mediaMimeType = decodeUtf8(mimeType);

  return {
    id: Number(mediaId),
    palateMediaId: Number(mediaId),
    source: "palate",
    ownerAddress: asString(ownerAddress),
    title: decodeUtf8(title) || `Media ${mediaId}`,
    category: mediaCategory,
    format: mimeTypeToFormat(mediaMimeType),
    status: chainStatusToFrontend(asNumber(status)),
    createdTime: formatChainTime(asString(createdTime)),
    shelbyBlobRef: decodeUtf8(shelbyBlobRef),
    contentHash: decodeUtf8(contentHash),
    mimeType: mediaMimeType,
    accent: accentForCategory(mediaCategory)
  };
}

export async function getUserMedia(walletAddress: string): Promise<MediaRecord[]> {
  const mediaIds = await viewOne<unknown[]>("getUserMedia", [walletAddress]);
  const normalizedIds = mediaIds.map((mediaId) => asString(mediaId));
  const records = await Promise.all(normalizedIds.map((mediaId) => getMediaRecordById(mediaId)));
  return records.sort((a, b) => b.id - a.id);
}

async function getWaitingPushById(pushId: string): Promise<WaitingPush> {
  const [
    mediaId,
    pusherAddress,
    pushAmount,
    status,
    minChallengeAmount
  ] = await Promise.all([
    viewOne("getWaitingPushMediaId", [pushId]),
    viewOne("getWaitingPushPusher", [pushId]),
    viewOne("getWaitingPushAmount", [pushId]),
    viewOne("getWaitingPushStatus", [pushId]),
    viewOne("getMinimumChallengeAmount", [pushId])
  ]);

  const media = await getMediaRecordById(asString(mediaId));

  return {
    id: Number(pushId),
    media,
    pusherAddress: asString(pusherAddress),
    pushAmount: formatOctasToApt(asString(pushAmount)),
    pushAmountOctas: asString(pushAmount),
    minChallengeAmount: formatOctasToApt(asString(minChallengeAmount)),
    minChallengeAmountOctas: asString(minChallengeAmount),
    createdTime: "On chain",
    status: chainWaitingPushStatusToFrontend(asNumber(status))
  };
}

export async function getWaitingPushes(): Promise<WaitingPush[]> {
  const pushIds = await viewOne<unknown[]>("getWaitingPushes");
  const normalizedIds = pushIds.map((pushId) => asString(pushId));
  const records = await Promise.all(normalizedIds.map((pushId) => getWaitingPushById(pushId)));
  return records.sort((a, b) => b.id - a.id);
}

async function getActiveMatchById(matchId: string): Promise<ActiveMatch> {
  const [
    mediaAId,
    mediaBId,
    pusherA,
    pusherB,
    pushAmountA,
    pushAmountB,
    category,
    endTime,
    status
  ] = await Promise.all([
    viewOne("getMatchMediaAId", [matchId]),
    viewOne("getMatchMediaBId", [matchId]),
    viewOne("getMatchPusherA", [matchId]),
    viewOne("getMatchPusherB", [matchId]),
    viewOne("getMatchPushAmountA", [matchId]),
    viewOne("getMatchPushAmountB", [matchId]),
    viewOne("getMatchCategory", [matchId]),
    viewOne("getMatchEndTime", [matchId]),
    viewOne("getMatchStatus", [matchId])
  ]);

  const [mediaA, mediaB] = await Promise.all([
    getMediaRecordById(asString(mediaAId)),
    getMediaRecordById(asString(mediaBId))
  ]);

  return {
    id: Number(matchId),
    mediaA,
    mediaB,
    pusherA: asString(pusherA),
    pusherB: asString(pusherB),
    pushAmountA: formatOctasToApt(asString(pushAmountA)),
    pushAmountB: formatOctasToApt(asString(pushAmountB)),
    category: chainCategoryToFrontend(asNumber(category)),
    timeRemaining: formatTimeRemaining(asString(endTime)),
    status: chainMatchStatusToFrontend(asNumber(status))
  };
}

export async function getActiveMatches(): Promise<ActiveMatch[]> {
  const matchIds = await viewOne<unknown[]>("getActiveMatches");
  const normalizedIds = matchIds.map((matchId) => asString(matchId));
  const records = await Promise.all(normalizedIds.map((matchId) => getActiveMatchById(matchId)));
  return records.sort((a, b) => b.id - a.id);
}

// Future Aptos view call boundary: read current assignment for a wallet.
export async function getCurrentAssignment(_walletAddress: string): Promise<BuffAssignment | null> {
  void _walletAddress;
  notImplemented("getCurrentAssignment");
}

export async function getPalateBalance(walletAddress: string): Promise<PalateBalance> {
  const [
    availableBalance,
    lockedPushAmount,
    lockedBuffAmount,
    lockedCommitmentAmount,
    totalDeposited,
    totalWithdrawn,
    totalClaimed
  ] = await Promise.all([
    viewOne("getAvailableBalance", [walletAddress]),
    viewOne("getLockedPushAmount", [walletAddress]),
    viewOne("getLockedBuffAmount", [walletAddress]),
    viewOne("getLockedCommitmentAmount", [walletAddress]),
    viewOne("getTotalDeposited", [walletAddress]),
    viewOne("getTotalWithdrawn", [walletAddress]),
    viewOne("getTotalClaimed", [walletAddress])
  ]);

  return {
    availableBalance: formatOctasToApt(asString(availableBalance)),
    lockedPushAmount: formatOctasToApt(asString(lockedPushAmount)),
    lockedBuffAmount: formatOctasToApt(asString(lockedBuffAmount)),
    lockedCommitmentAmount: formatOctasToApt(asString(lockedCommitmentAmount)),
    totalDeposited: formatOctasToApt(asString(totalDeposited)),
    totalWithdrawn: formatOctasToApt(asString(totalWithdrawn)),
    totalClaimed: formatOctasToApt(asString(totalClaimed))
  };
}

// Future Aptos view call boundary: read claim helpers and claim state.
export async function getClaimRecords(_walletAddress: string): Promise<ClaimRecord[]> {
  void _walletAddress;
  notImplemented("getClaimRecords");
}

// Future Aptos view call boundary: read user_summary.
export async function getUserSummary(_walletAddress: string): Promise<UserSummary> {
  void _walletAddress;
  notImplemented("getUserSummary");
}

// Future signed entry-function boundary. Local UI flows call provider actions until real Aptos transactions are wired.
export async function submitPalateTransaction(_functionName: string, _args: unknown[]): Promise<never> {
  void _functionName;
  void _args;
  notImplemented("submitPalateTransaction");
}
