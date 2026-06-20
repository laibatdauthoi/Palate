import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import type { InputGenerateTransactionPayloadData, SimpleEntryFunctionArgumentTypes } from "@aptos-labs/ts-sdk";
import { app_config } from "@/config/app_config";
import { logUiPerf, startUiPerf } from "@/utils/ui_perf";
import type {
  ActiveMatch,
  BuffAssignment,
  BuffSide,
  ChainCategoryConstants,
  ChainProtocolConfig,
  ClaimRecord,
  MediaCategory,
  MediaFormat,
  MediaRecord,
  PalateActivityTransaction,
  PalateActivityFilter,
  MediaStorageStatus,
  MediaStatus,
  PalateBalance,
  UserSummary,
  WaitingPush
} from "@/types/palate";

const aptos_config = new AptosConfig({
  network: Network.TESTNET,
  fullnode: app_config.aptosFullnodeUrl,
  clientConfig: app_config.testnetApiKeyEnabled
    ? {
        API_KEY: app_config.testnetApiKey
      }
    : undefined
});
const aptos = new Aptos(aptos_config);
const OCTAS_PER_APT = BigInt(100000000);
const view_retry_count = 2;
const view_retry_delay_ms = 250;
const wallet_balance_retry_count = 2;
const wallet_balance_retry_delay_ms = 250;
const rate_limit_cooldown_ms = 20000;
const max_concurrent_reads = 2;
const aptos_coin_type = "0x1::aptos_coin::AptosCoin";
const aptos_coin_store_resource = `0x1::coin::CoinStore<${aptos_coin_type}>`;
const aptos_api_key_header_name = "Authorization";

const module_id = `${app_config.moduleAddress}::${app_config.moduleName}`;

function notImplemented(functionName: string): never {
  throw new Error(`${functionName} is not implemented. Future work should use Aptos ${app_config.networkLabel} view calls or signed entry-function transactions.`);
}

function viewFunction(functionName: string) {
  return `${module_id}::${functionName}` as `${string}::${string}::${string}`;
}

type ReadDiagnosticsOptions = {
  endpoint?: string;
  functionId?: string;
  retries?: number;
  delayMs?: number;
  dedupeKey?: string;
};

type ReadError = Error & {
  status?: number;
  endpoint?: string;
  readName?: string;
  isRateLimit?: boolean;
  retryCount?: number;
  durationMs?: number;
};

let read_cooldown_until = 0;
let active_read_count = 0;
const read_queue: Array<() => void> = [];
const inflight_reads = new Map<string, Promise<unknown>>();
let aptos_api_key_mode_logged = false;

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error ?? "Unknown read failure");
}

function extractErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") return {};

  const maybe = error as { url?: string; status?: number; endpoint?: string; response?: { status?: number } };
  return {
    url: maybe.url ?? maybe.endpoint,
    status: maybe.status ?? maybe.response?.status
  };
}

function createReadError(name: string, endpoint: string, message: string, extras: Partial<ReadError> = {}): ReadError {
  const error = new Error(message) as ReadError;
  error.name = "PalateReadError";
  error.readName = name;
  error.endpoint = endpoint;
  Object.assign(error, extras);
  return error;
}

function getAptosRequestHeaders(headers?: HeadersInit, options: { includeJsonContentType?: boolean } = {}) {
  const merged = new Headers(headers);

  if (!merged.has("Accept")) {
    merged.set("Accept", "application/json");
  }

  if (options.includeJsonContentType && !merged.has("Content-Type")) {
    merged.set("Content-Type", "application/json");
  }

  if (app_config.testnetApiKeyEnabled && !merged.has(aptos_api_key_header_name)) {
    // The local Aptos TS SDK maps clientConfig.API_KEY to Authorization: Bearer <key>.
    // Keep the header name centralized here so it is easy to change if provider requirements differ.
    merged.set(aptos_api_key_header_name, `Bearer ${app_config.testnetApiKey}`);
  }

  return merged;
}

function isRateLimitError(error: unknown): error is ReadError {
  return typeof error === "object" && error !== null && (error as ReadError).isRateLimit === true;
}

export function isAptosReadRateLimited(error: unknown) {
  return isRateLimitError(error) || extractErrorDetails(error).status === 429 || getErrorMessage(error).toLowerCase().includes("rate limit");
}

function isMissingAptosCoinStoreBalanceError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("resource_not_found")
    && message.includes("0x1::coin::coinstore<0x1::aptos_coin::aptoscoin>");
}

export function getAptosReadCooldownRemainingMs() {
  return Math.max(0, read_cooldown_until - Date.now());
}

function withReadSlot<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active_read_count += 1;
      void task()
        .then(resolve, reject)
        .finally(() => {
          active_read_count = Math.max(0, active_read_count - 1);
          const next = read_queue.shift();
          if (next) next();
        });
    };

    if (active_read_count < max_concurrent_reads) {
      run();
      return;
    }

    read_queue.push(run);
  });
}

async function fetchJsonWithDiagnostics<T>(name: string, endpointPath: string, init?: RequestInit): Promise<T> {
  const endpoint = endpointPath.startsWith("http") ? endpointPath : `${app_config.aptosFullnodeUrl}${endpointPath}`;
  const response = await fetch(endpoint, {
    ...init,
    headers: getAptosRequestHeaders(init?.headers, {
      includeJsonContentType: init?.method?.toUpperCase() === "POST"
    })
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 429) {
    const bodyText = await response.text();
    throw createReadError(name, endpoint, "Aptos RPC rate limited", {
      status: 429,
      isRateLimit: true,
      cause: bodyText
    });
  }

  if (!response.ok) {
    const bodyText = contentType.includes("application/json") ? JSON.stringify(await response.json().catch(() => null)) : await response.text();
    throw createReadError(name, endpoint, bodyText || `HTTP ${response.status}`, {
      status: response.status
    });
  }

  if (!contentType.includes("application/json")) {
    const bodyText = await response.text();
    throw createReadError(name, endpoint, bodyText || "Unexpected non-JSON response.", {
      status: response.status
    });
  }

  return response.json() as Promise<T>;
}

async function viewOne<T>(functionName: string, functionArguments: SimpleEntryFunctionArgumentTypes[] = []): Promise<T> {
  return readWithDiagnostics(
    `view:${functionName}`,
    async () => {
      const result = await fetchJsonWithDiagnostics<[T]>(`view:${functionName}`, "/view", {
        method: "POST",
        body: JSON.stringify({
          function: viewFunction(functionName),
          type_arguments: [],
          arguments: functionArguments
        })
      });
      return result[0];
    },
    {
      functionId: viewFunction(functionName),
      endpoint: "/view",
      retries: view_retry_count,
      delayMs: view_retry_delay_ms,
      dedupeKey: `view:${functionName}:${JSON.stringify(functionArguments)}`
    }
  );
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

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function readWithDiagnostics<T>(name: string, read: () => Promise<T>, options: ReadDiagnosticsOptions = {}): Promise<T> {
  if (app_config.debugAptosReads && !aptos_api_key_mode_logged) {
    aptos_api_key_mode_logged = true;
    console.info("Aptos API key enabled:", app_config.testnetApiKeyEnabled);
  }

  const retries = options.retries ?? 0;
  const delayMs = options.delayMs ?? 0;
  const dedupeKey = options.dedupeKey ?? name;
  const cachedInFlight = inflight_reads.get(dedupeKey) as Promise<T> | undefined;
  if (cachedInFlight) {
    logUiPerf("aptosRead:deduped", {
      name,
      dedupeKey,
      functionId: options.functionId ?? null,
      endpoint: options.endpoint ?? null
    });
    return cachedInFlight;
  }

  const execution = withReadSlot(async () => {
    const now = Date.now();
    if (read_cooldown_until > now) {
      throw createReadError(name, options.endpoint ?? name, "Aptos RPC rate limited", {
        status: 429,
        isRateLimit: true
      });
    }

  let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      const finishPerf = startUiPerf("aptosRead", {
        name,
        attempt,
        retries,
        dedupeKey,
        functionId: options.functionId ?? null,
        endpoint: options.endpoint ?? null,
        queuedReads: read_queue.length,
        activeReads: active_read_count
      });
      try {
        const result = await read();
        finishPerf("success");
        return result;
      } catch (error) {
        lastError = error;
        const duration = Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt);
        const details = extractErrorDetails(error);
        const payload = {
          name,
          message: getErrorMessage(error),
          functionId: options.functionId ?? null,
          endpoint: options.endpoint ?? details.url ?? null,
          retryCount: attempt,
          durationMs: duration,
          status: details.status ?? null
        };
        finishPerf("error", {
          message: payload.message,
          status: payload.status,
          retryCount: attempt
        });

        if (isRateLimitError(error) || details.status === 429 || getErrorMessage(error).toLowerCase().includes("rate limit")) {
          read_cooldown_until = Date.now() + rate_limit_cooldown_ms;
          if (app_config.debugAptosReads) {
            console.warn("Aptos RPC rate limited", payload, error);
          } else {
            console.warn("Aptos RPC rate limited", payload);
          }
          break;
        }

        if (app_config.debugAptosReads) {
          console.warn("[Palate read failed]", payload, error);
        } else {
          console.warn("[Palate read failed]", payload);
        }

        if (attempt === retries) {
          break;
        }
        await delay(delayMs * (attempt + 1));
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`${name} failed.`);
  });

  inflight_reads.set(dedupeKey, execution);
  execution.finally(() => {
    inflight_reads.delete(dedupeKey);
  });

  return execution;
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

function chainStorageStatusToFrontend(status: number): MediaStorageStatus {
  if (status === 2) return "shelby_upload_failed";
  if (status === 3) return "deleted";
  return "uploaded";
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

function formatTransactionTimestamp(timestampMicros: string | number | null | undefined) {
  if (timestampMicros === null || timestampMicros === undefined) return null;
  const numeric = Number(timestampMicros);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return formatChainTime(String(Math.floor(numeric / 1000000)));
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

function isNumericArgument(value: unknown): value is string | number {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return /^\d+$/.test(value);
  return false;
}

function decodeActivityAmount(functionName: string, args: unknown[]) {
  const amountIndexByFunction: Partial<Record<string, number>> = {
    depositBalance: 0,
    withdrawBalance: 0,
    createPush: 1,
    challengePush: 2,
    placeBuff: 1
  };

  const amountIndex = amountIndexByFunction[functionName];
  if (amountIndex === undefined) return undefined;
  const candidate = args[amountIndex];
  if (!isNumericArgument(candidate)) return undefined;
  return formatOctasToApt(candidate);
}

function decodeActivityId(functionName: string, args: unknown[]) {
  const idIndexByFunction: Partial<Record<string, number>> = {
    delete_media: 0,
    delete_failed_media: 0,
    createPush: 0,
    cancelPush: 0,
    challengePush: 0,
    settleMatch: 0,
    claimPush: 0,
    claimBuff: 0,
    repairSettledMatchMedia: 0
  };

  const idIndex = idIndexByFunction[functionName];
  if (idIndex === undefined) return undefined;
  const candidate = args[idIndex];
  if (!isNumericArgument(candidate)) return undefined;
  return String(candidate);
}

function getActivityLabel(functionName: string) {
  const labels: Record<string, string> = {
    initialize: "Initialized Palate",
    depositBalance: "Deposited",
    withdrawBalance: "Withdrew",
    registerMedia: "Registered media",
    register_shelby_upload_failed_media: "Registered failed upload",
    delete_media: "Deleted media",
    delete_failed_media: "Deleted failed media",
    createPush: "Created push",
    cancelPush: "Canceled push",
    expireWaitingPush: "Expired waiting push",
    challengePush: "Challenged push",
    findMatch: "Found match",
    placeBuff: "Placed Buff",
    skipMatch: "Skipped match",
    settleMatch: "Settled match",
    claimPush: "Claimed reward",
    claimBuff: "Claimed reward",
    repairSettledMatchMedia: "Repaired settled media",
    updateFeeConfig: "Updated fee config",
    updatePushConfig: "Updated push config",
    updateBuffConfig: "Updated Buff config",
    updateMatchConfig: "Updated match config",
    updateScoreConfig: "Updated score config"
  };

  return labels[functionName] ?? functionName;
}

function getActivityFilter(functionName: string): Exclude<PalateActivityFilter, "All" | "Failed"> | null {
  const filters: Record<string, Exclude<PalateActivityFilter, "All" | "Failed">> = {
    initialize: "Admin",
    depositBalance: "Balance",
    withdrawBalance: "Balance",
    registerMedia: "Media",
    register_shelby_upload_failed_media: "Media",
    delete_media: "Media",
    delete_failed_media: "Media",
    createPush: "Push",
    cancelPush: "Push",
    expireWaitingPush: "Push",
    challengePush: "Push",
    findMatch: "Buff",
    placeBuff: "Buff",
    skipMatch: "Buff",
    settleMatch: "Match",
    claimPush: "Claims",
    claimBuff: "Claims",
    repairSettledMatchMedia: "Media",
    updateFeeConfig: "Admin",
    updatePushConfig: "Admin",
    updateBuffConfig: "Admin",
    updateMatchConfig: "Admin",
    updateScoreConfig: "Admin"
  };

  return filters[functionName] ?? null;
}

export function shortenTransactionHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export function getReadablePalateError(error: unknown, fallback = "Transaction failed.") {
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const normalized = rawMessage.toLowerCase();

  if (rawMessage.includes("E_MATCH_NOT_EXPIRED") || normalized.includes("abort_code: 23") || normalized.includes("abort code: 23") || normalized.includes("code: 23")) {
    return "Match is not ready to settle yet.";
  }
  if (rawMessage.includes("E_MATCH_NOT_ACTIVE") || normalized.includes("abort_code: 24") || normalized.includes("abort code: 24") || normalized.includes("code: 24")) {
    return "Match is not active.";
  }
  if (rawMessage.includes("E_MATCH_NOT_SETTLED") || normalized.includes("abort_code: 25") || normalized.includes("abort code: 25") || normalized.includes("code: 25")) {
    return "Match is already settled.";
  }
  if (rawMessage.includes("E_NOT_WINNING_PUSHER") || normalized.includes("abort_code: 26") || normalized.includes("abort code: 26") || normalized.includes("code: 26")) {
    return "Not authorized to claim this Push reward.";
  }
  if (rawMessage.includes("E_PUSH_ALREADY_CLAIMED") || normalized.includes("abort_code: 27") || normalized.includes("abort code: 27") || normalized.includes("code: 27")) {
    return "Push reward is already claimed.";
  }
  if (rawMessage.includes("E_NOT_WINNING_BUFF") || normalized.includes("abort_code: 29") || normalized.includes("abort code: 29") || normalized.includes("code: 29")) {
    return "Not authorized to claim this Buff reward.";
  }
  if (rawMessage.includes("E_BUFF_ALREADY_CLAIMED") || normalized.includes("abort_code: 30") || normalized.includes("abort code: 30") || normalized.includes("code: 30")) {
    return "Buff reward is already claimed.";
  }
  if (rawMessage.includes("E_PUSH_AMOUNT_TOO_LOW") || normalized.includes("abort_code: 8") || normalized.includes("abort code: 8") || normalized.includes("code: 8")) {
    return "Push amount is below the minimum.";
  }
  if (rawMessage.includes("E_WAITING_PUSH_EXPIRED") || normalized.includes("abort_code: 43") || normalized.includes("abort code: 43") || normalized.includes("code: 43")) {
    return "Waiting push already expired. Clean it up before continuing.";
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

export async function getWalletAptBalance(walletAddress: string): Promise<string> {
  const readers: Array<() => Promise<number | string | bigint>> = [
    () =>
      readWithDiagnostics(
        "wallet:getBalance",
        () => aptos.getBalance({ accountAddress: walletAddress, asset: aptos_coin_type }),
        {
          endpoint: "accounts/getBalance",
          retries: wallet_balance_retry_count,
          delayMs: wallet_balance_retry_delay_ms,
          dedupeKey: `wallet-balance:${walletAddress}`
        }
      ),
    () =>
      readWithDiagnostics(
        "wallet:getAccountResource:CoinStore",
        async () => {
          const resource = await fetchJsonWithDiagnostics<{ data: { coin?: { value?: string | number | bigint } } }>(
            "wallet:getAccountResource:CoinStore",
            `/accounts/${walletAddress}/resource/${encodeURIComponent(aptos_coin_store_resource)}`
          );
          const value = resource.data?.coin?.value;
          if (value === undefined || value === null) {
            throw new Error("CoinStore balance field is missing.");
          }
          return value;
        },
        {
          endpoint: `/accounts/${walletAddress}/resource/${aptos_coin_store_resource}`,
          retries: wallet_balance_retry_count,
          delayMs: wallet_balance_retry_delay_ms,
          dedupeKey: `wallet-balance:${walletAddress}:fallback`
        }
      )
  ];

  let lastError: unknown;
  let sawMissingCoinStore = false;
  let sawNonCoinStoreFailure = false;
  for (const read of readers) {
    try {
      const amount = await read();
      return formatOctasToApt(amount);
    } catch (error) {
      if (isMissingAptosCoinStoreBalanceError(error)) {
        sawMissingCoinStore = true;
        lastError = error;
        continue;
      }
      lastError = error;
      sawNonCoinStoreFailure = true;
      if (isRateLimitError(error) || extractErrorDetails(error).status === 429) {
        break;
      }
    }
  }

  if (sawMissingCoinStore && !sawNonCoinStoreFailure) {
    return formatOctasToApt(0);
  }

  throw lastError instanceof Error ? lastError : new Error("Wallet balance unavailable.");
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

export function buildExpireWaitingPushPayload(pushId: number | string): InputGenerateTransactionPayloadData {
  return entryPayload("expireWaitingPush", [String(pushId)]);
}

export function buildFindMatchPayload(): InputGenerateTransactionPayloadData {
  return entryPayload("findMatch", []);
}

export function buildSkipMatchPayload(): InputGenerateTransactionPayloadData {
  return entryPayload("skipMatch", []);
}

export function buildPlaceBuffPayload(side: BuffSide, buffAmountOctas: string): InputGenerateTransactionPayloadData {
  return entryPayload("placeBuff", [side === "A" ? 1 : 2, buffAmountOctas]);
}

export function buildSettleMatchPayload(matchId: number | string): InputGenerateTransactionPayloadData {
  return entryPayload("settleMatch", [String(matchId)]);
}

export function buildRepairSettledMatchMediaPayload(matchId: number | string): InputGenerateTransactionPayloadData {
  return entryPayload("repairSettledMatchMedia", [String(matchId)]);
}

export type ClaimRewardInput = {
  type: ClaimRecord["type"];
  matchId: number | string;
};

export function buildClaimPushPayload(matchId: number | string): InputGenerateTransactionPayloadData {
  return entryPayload("claimPush", [String(matchId)]);
}

export function buildClaimBuffPayload(matchId: number | string): InputGenerateTransactionPayloadData {
  return entryPayload("claimBuff", [String(matchId)]);
}

export function buildClaimRewardPayload(input: ClaimRewardInput): InputGenerateTransactionPayloadData {
  return input.type === "buff"
    ? buildClaimBuffPayload(input.matchId)
    : buildClaimPushPayload(input.matchId);
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

export function buildRegisterShelbyUploadFailedMediaPayload(input: RegisterMediaInput): InputGenerateTransactionPayloadData {
  return entryPayload("register_shelby_upload_failed_media", [
    categoryToChainValue(input.category, input.categoryConstants),
    encodeUtf8(input.shelbyBlobRef),
    encodeUtf8(input.contentHash),
    encodeUtf8(input.mimeType),
    encodeUtf8(input.title),
    input.createdTime
  ]);
}

export function buildDeleteFailedMediaPayload(mediaId: number | string): InputGenerateTransactionPayloadData {
  return entryPayload("delete_failed_media", [String(mediaId)]);
}

export function buildDeleteMediaPayload(mediaId: number | string): InputGenerateTransactionPayloadData {
  return entryPayload("delete_media", [String(mediaId)]);
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
  const [protocolResult, categoriesResult] = await Promise.allSettled([
    getProtocolConfig(),
    getCategoryConstants()
  ]);

  if (protocolResult.status !== "fulfilled") {
    throw protocolResult.reason instanceof Error
      ? protocolResult.reason
      : new Error("Contract read temporarily unavailable");
  }

  const protocolConfig = protocolResult.value;
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
  const warning = categoriesResult.status === "rejected"
    ? "Using protocol config without refreshed category constants."
    : null;

  return {
    categories,
    treasuryAddress: protocolConfig.treasuryAddress,
    protocolConfig,
    warning
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
    status,
    storageStatus
  ] = await Promise.all([
    viewOne("getMediaOwner", [mediaId]),
    viewOne("getMediaCategory", [mediaId]),
    viewOne("getMediaShelbyBlobRef", [mediaId]),
    viewOne("getMediaContentHash", [mediaId]),
    viewOne("getMediaMimeType", [mediaId]),
    viewOne("getMediaTitle", [mediaId]),
    viewOne("getMediaCreatedTime", [mediaId]),
    viewOne("getMediaStatus", [mediaId]),
    viewOne("getMediaStorageStatus", [mediaId])
  ]);

  const mediaCategory = chainCategoryToFrontend(asNumber(category));
  const mediaMimeType = decodeUtf8(mimeType);

  const record: MediaRecord = {
    id: Number(mediaId),
    palateMediaId: Number(mediaId),
    source: "palate",
    ownerAddress: asString(ownerAddress),
    title: decodeUtf8(title) || `Media ${mediaId}`,
    category: mediaCategory,
    format: mimeTypeToFormat(mediaMimeType),
    status: chainStatusToFrontend(asNumber(status)),
    storageStatus: chainStorageStatusToFrontend(asNumber(storageStatus)),
    createdTime: formatChainTime(asString(createdTime)),
    shelbyBlobRef: decodeUtf8(shelbyBlobRef),
    contentHash: decodeUtf8(contentHash),
    mimeType: mediaMimeType,
    accent: accentForCategory(mediaCategory)
  };

  if (record.status === "waiting" && record.storageStatus === "uploaded") {
    try {
      const waitingPushId = asString(await viewOne("getWaitingPushIdForMedia", [mediaId]));
      const [waitingPushCreatedTime, waitingPushExpired, waitingPushExpirySeconds] = await Promise.all([
        viewOne("getWaitingPushCreatedTime", [waitingPushId]),
        viewOne("isWaitingPushExpired", [waitingPushId]),
        viewOne("getWaitingPushExpirySeconds")
      ]);
      record.waitingPushId = Number(waitingPushId);
      record.waitingPushCreatedTimeSeconds = asString(waitingPushCreatedTime);
      record.waitingPushExpired = Boolean(waitingPushExpired);
      record.waitingPushExpirySeconds = asString(waitingPushExpirySeconds);
    } catch {
      // Preserve the chain media record even if waiting-push metadata is unavailable.
    }
  }

  return record;
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
    minChallengeAmount,
    createdTime,
    expirySeconds
  ] = await Promise.all([
    viewOne("getWaitingPushMediaId", [pushId]),
    viewOne("getWaitingPushPusher", [pushId]),
    viewOne("getWaitingPushAmount", [pushId]),
    viewOne("getWaitingPushStatus", [pushId]),
    viewOne("getMinimumChallengeAmount", [pushId]),
    viewOne("getWaitingPushCreatedTime", [pushId]),
    viewOne("getWaitingPushExpirySeconds")
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
    createdTime: formatChainTime(asString(createdTime)),
    createdTimeSeconds: asString(createdTime),
    expirySeconds: asString(expirySeconds),
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
    endTimeSeconds: asString(endTime),
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
export async function getCurrentAssignment(walletAddress: string): Promise<BuffAssignment | null> {
  const hasCurrentAssignment = await viewOne<boolean>("hasCurrentAssignment", [walletAddress]);
  if (!hasCurrentAssignment) {
    return null;
  }

  const [matchId, commitmentAmount, skipPenaltyAmountSnapshot, assignedTime] = await Promise.all([
    viewOne("getCurrentAssignmentMatchId", [walletAddress]),
    viewOne("getCurrentAssignmentCommitmentAmount", [walletAddress]),
    viewOne("getCurrentAssignmentSkipPenaltyAmount", [walletAddress]),
    viewOne("getCurrentAssignmentAssignedTime", [walletAddress])
  ]);
  const match = await getActiveMatchById(asString(matchId));
  if (match.status === "settled") {
    return null;
  }

  return {
    match,
    assignedAt: formatChainTime(asString(assignedTime)),
    commitmentAmount: formatOctasToApt(asString(commitmentAmount)),
    skipPenaltyAmount: formatOctasToApt(asString(skipPenaltyAmountSnapshot))
  };
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

function claimRewardTypeToFrontend(value: number): ClaimRecord["type"] {
  return value === 2 ? "buff" : "push";
}

export async function getClaimRecords(walletAddress: string): Promise<ClaimRecord[]> {
  type ChainClaimDiscoveryRecord = {
    claim_key: string | number;
    match_id: string | number;
    reward_type: string | number;
    claimable_amount: string | number;
    claimable: boolean;
    claimed: boolean;
    settled: boolean;
  };

  const records = await viewOne<ChainClaimDiscoveryRecord[]>("getClaimDiscoveryRecords", [walletAddress]);
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  return records
    .map((record) => {
      const normalizedMatchId = Number(asString(record.match_id));
      const normalizedRewardType = claimRewardTypeToFrontend(asNumber(record.reward_type));

      return {
        id: Number(asString(record.claim_key)),
        claimKey: Number(asString(record.claim_key)),
        matchId: normalizedMatchId,
        type: normalizedRewardType,
        matchRef: `Match ${normalizedMatchId}`,
        amount: formatOctasToApt(asString(record.claimable_amount)),
        claimableAmountOctas: asString(record.claimable_amount),
        settledTime: Boolean(record.settled) ? "Settled on chain" : "Pending settlement",
        claimable: Boolean(record.claimable),
        claimed: Boolean(record.claimed),
        settled: Boolean(record.settled)
      } satisfies ClaimRecord;
    })
    .sort((a, b) => b.id - a.id);
}

type AccountTransactionPayload = {
  type?: string;
  function?: string;
  arguments?: unknown[];
};

type AccountTransaction = {
  type?: string;
  hash?: string;
  success?: boolean;
  timestamp?: string;
  version?: string;
  payload?: AccountTransactionPayload;
};

export async function getPalateTransactionLog(walletAddress: string, options: { limit?: number } = {}): Promise<PalateActivityTransaction[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 80, 100));
  const normalizedWalletAddress = walletAddress.trim().toLowerCase();
  const endpoint = `/accounts/${walletAddress}/transactions?limit=${limit}`;
  const transactions = await readWithDiagnostics<AccountTransaction[]>(
    `accountTransactions:${normalizedWalletAddress}`,
    () => fetchJsonWithDiagnostics<AccountTransaction[]>(`accountTransactions:${normalizedWalletAddress}`, endpoint),
    {
      endpoint,
      retries: 1,
      delayMs: view_retry_delay_ms,
      dedupeKey: `accountTransactions:${normalizedWalletAddress}:${limit}`
    }
  );

  const palateTransactions: PalateActivityTransaction[] = transactions
    .filter((transaction) => transaction.type === "user_transaction")
    .map((transaction): PalateActivityTransaction | null => {
      const payload = transaction.payload;
      const fullFunction = payload?.function;
      if (!fullFunction || !fullFunction.startsWith(`${module_id}::`)) {
        return null;
      }

      const functionName = fullFunction.split("::").pop() ?? fullFunction;
      const filter = getActivityFilter(functionName);
      if (!filter) return null;

      const hash = transaction.hash ?? "";
      const args = Array.isArray(payload?.arguments) ? payload.arguments : [];
      const success = transaction.success === true;

      return {
        id: hash || `${functionName}:${transaction.version ?? Math.random().toString(36).slice(2)}`,
        hash,
        shortHash: hash ? shortenTransactionHash(hash) : "Unknown tx",
        functionName,
        filter,
        title: getActivityLabel(functionName),
        status: success ? "Success" : "Failed",
        timestamp: formatTransactionTimestamp(transaction.timestamp),
        amount: decodeActivityAmount(functionName, args),
        decodedId: decodeActivityId(functionName, args),
        explorerUrl: hash ? `${app_config.aptosExplorerBaseUrl}/${hash}?network=testnet` : `${app_config.aptosExplorerBaseUrl}?network=testnet`
      } satisfies PalateActivityTransaction;
    })
    .filter((transaction): transaction is PalateActivityTransaction => transaction !== null);

  return palateTransactions;
}

function formatWinRate(wins: number, total: number) {
  if (total <= 0) return "0%";
  return `${((wins / total) * 100).toFixed(1)}%`;
}

export async function getUserSummary(walletAddress: string): Promise<UserSummary> {
  type ChainUserSummary = {
    push_count: string | number;
    push_win_count: string | number;
    push_loss_count: string | number;
    push_profit: string | number;
    buff_count: string | number;
    buff_win_count: string | number;
    buff_loss_count: string | number;
    buff_profit: string | number;
    total_pushed: string | number;
    total_buffed: string | number;
    claimable_amount: string | number;
  };

  if (app_config.debugAptosReads) {
    console.info("[Palate user summary] start", { view: "getUserSummary", walletAddress });
  }

  try {
    const summary = await viewOne<ChainUserSummary>("getUserSummary", [walletAddress]);
    const pushCount = asNumber(summary.push_count);
    const pushWins = asNumber(summary.push_win_count);
    const pushLosses = asNumber(summary.push_loss_count);
    const buffCount = asNumber(summary.buff_count);
    const buffWins = asNumber(summary.buff_win_count);
    const buffLosses = asNumber(summary.buff_loss_count);

    const result: UserSummary = {
      walletAddress,
      claimableAmount: formatOctasToApt(asString(summary.claimable_amount)),
      pushProfit: formatOctasToApt(asString(summary.push_profit)),
      buffProfit: formatOctasToApt(asString(summary.buff_profit)),
      totalPushed: formatOctasToApt(asString(summary.total_pushed)),
      totalBuffed: formatOctasToApt(asString(summary.total_buffed)),
      pushWinRate: formatWinRate(pushWins, pushCount),
      buffWinRate: formatWinRate(buffWins, buffCount),
      pushCount: String(pushCount),
      pushWins: String(pushWins),
      pushLosses: String(pushLosses),
      buffCount: String(buffCount),
      buffWins: String(buffWins),
      buffLosses: String(buffLosses),
      pendingBuffs: "Unavailable",
      skipPenalty: "Unavailable"
    };

    if (app_config.debugAptosReads) {
      console.info("[Palate user summary] success", { view: "getUserSummary", walletAddress, summary: result });
    }

    return result;
  } catch (error) {
    if (app_config.debugAptosReads) {
      console.warn("[Palate user summary] failure", {
        view: "getUserSummary",
        walletAddress,
        error: error instanceof Error ? error.message : String(error ?? "Unknown error")
      });
    }
    throw error;
  }
}

// Future signed entry-function boundary. Local UI flows call provider actions until real Aptos transactions are wired.
export async function submitPalateTransaction(_functionName: string, _args: unknown[]): Promise<never> {
  void _functionName;
  void _args;
  notImplemented("submitPalateTransaction");
}
