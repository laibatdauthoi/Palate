"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { mock_balance, mock_matches, mock_media, mock_summary, mock_waiting_pushes } from "@/data/mock_data";
import { VIDEO_ENABLED, app_config } from "@/config/app_config";
import {
  buildClaimRewardPayload,
  buildChallengePushPayload,
  buildCreatePushPayload,
  buildDeleteMediaPayload,
  buildFindMatchPayload,
  buildPlaceBuffPayload,
  buildSettleMatchPayload,
  buildSkipMatchPayload,
  buildRegisterMediaPayload,
  buildRegisterShelbyUploadFailedMediaPayload,
  buildDepositBalancePayload,
  buildWithdrawBalancePayload,
  formatOctasToApt,
  getActiveMatches as readActiveMatches,
  getChainReadSnapshot,
  getClaimRecords as readClaimRecords,
  getCurrentAssignment as readCurrentAssignment,
  getPalateTransactionLog,
  getPalateBalance,
  getReadablePalateError,
  getUserSummary as readUserSummary,
  getUserMedia,
  getWaitingPushes as readWaitingPushes,
  parseAptToOctas,
  shortenTransactionHash,
  waitForPalateTransaction
} from "@/services/aptos_service";
import {
  buildShelbyDeleteBlobPayload,
  isShelbyBlobNotFoundError,
  preflightShelbyBlob,
  prepareShelbyUpload,
  registerShelbyBlob,
  uploadPreparedBlobToShelby,
  type RegisteredShelbyUpload
} from "@/services/shelby_service";
import { usePalateWallet } from "@/providers/wallet_provider";
import {
  detectMediaKindFromFile,
  getFileCategoryMessage,
  isCategoryCompatibleWithKind
} from "@/utils/media_file_validation";
import { getPushEligibility } from "@/utils/push_eligibility";
import { getMediaDisplayTitle } from "@/utils/media_display";
import { startUiPerf } from "@/utils/ui_perf";
import type {
  ActiveMatch,
  BuffAssignment,
  BuffSide,
  ChainReadState,
  ClaimableRewardsSummary,
  ClaimRecord,
  MediaCategory,
  MediaFormat,
  MediaRecord,
  PalateActivityTransaction,
  PalateBalance,
  UploadStep,
  UserSummary,
  WaitingPush,
  WalletStatus
} from "@/types/palate";

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
} | null;

type UploadMediaInput = {
  category: MediaCategory;
  title: string;
  format: MediaFormat;
  mimeType: string;
  fileName?: string;
  file?: File | null;
};

type UploadRecoveryState = {
  canRetry: boolean;
  retryCount: number;
  error: string | null;
  shelbyRegistrationHash: string | null;
  blobName: string | null;
  ownerAddress: string | null;
  contentHash: string | null;
  fileName: string | null;
};

type UploadRetryDraft = {
  registeredUpload: RegisteredShelbyUpload;
  category: MediaCategory;
  format: MediaFormat;
  title: string;
  mimeType: string;
  createdTimeSeconds: string;
};

type DeletePendingRecord = {
  ownerAddress: string;
  mediaId: number;
  shelbyBlobRef: string;
  title: string;
  status: "delete_pending";
};

function getClaimableRewardsSummary(records: ClaimRecord[]): ClaimableRewardsSummary {
  const claimableTotalOctas = records.reduce((total, record) => {
    if (!record.claimable || record.claimed) return total;
    try {
      const amount = BigInt(record.claimableAmountOctas);
      if (amount <= BigInt(0)) return total;
      return total + amount;
    } catch {
      return total;
    }
  }, BigInt(0));

  const claimableCount = records.reduce((count, record) => {
    try {
      return record.claimable && !record.claimed && BigInt(record.claimableAmountOctas) > BigInt(0) ? count + 1 : count;
    } catch {
      return count;
    }
  }, 0);

  return {
    claimableCount,
    claimableTotalOctas: claimableTotalOctas.toString(),
    hasClaimableRewards: claimableCount > 0
  };
}

type PalateContextValue = {
  walletStatus: WalletStatus;
  setWalletStatus: (status: WalletStatus) => void;
  mockWalletAddress: string;
  balance: PalateBalance;
  mediaRecords: MediaRecord[];
  waitingPushes: WaitingPush[];
  activeMatches: ActiveMatch[];
  currentAssignment: BuffAssignment | null;
  completedBuffSide: BuffSide | null;
  noValidMatchAvailable: boolean;
  claimRecords: ClaimRecord[];
  userSummary: UserSummary;
  uploadStep: UploadStep | null;
  uploadRecovery: UploadRecoveryState;
  mediaReadStatus: "idle" | "loading" | "ready" | "error";
  processingAction: string | null;
  feedback: Feedback;
  chainRead: ChainReadState;
  claimReadStatus: "idle" | "loading" | "ready" | "error";
  palateBalanceReadStatus: "idle" | "loading" | "ready" | "error";
  userSummaryReadStatus: "idle" | "loading" | "ready" | "error";
  activityReadStatus: "idle" | "loading" | "ready" | "error";
  activityTransactions: PalateActivityTransaction[];
  claimableRewardsSummary: ClaimableRewardsSummary;
  clearFeedback: () => void;
  refreshClaims: () => Promise<void>;
  refreshProfileActivity: () => Promise<void>;
  connectMockWallet: () => void;
  disconnectMockWallet: () => void;
  simulateWrongNetwork: () => void;
  simulateWalletError: () => void;
  depositBalance: (amount: string) => Promise<void>;
  withdrawBalance: (amount: string) => Promise<void>;
  findMatch: () => Promise<void>;
  placeBuff: (side: BuffSide, amount: string) => Promise<void>;
  placeMockBuff: (side: BuffSide, amount: string) => Promise<void>;
  skipMatch: () => Promise<void>;
  settleMatch: (matchId: number) => Promise<void>;
  uploadMedia: (input: UploadMediaInput) => Promise<void>;
  retryPalateRegistration: (mediaId: number) => Promise<void>;
  deleteMedia: (mediaId: number) => Promise<void>;
  retryOnChainDelete: (mediaId: number) => Promise<void>;
  markMediaContentUnavailable: (mediaId: number) => void;
  clearPendingRegistration: (mediaId: number) => void;
  resetUploadFlow: () => void;
  uploadMockMedia: (input: UploadMediaInput) => Promise<void>;
  createPush: (mediaId: number, amount: string) => Promise<void>;
  challengePush: (pushId: number, challengerMediaId: number, amount: string) => Promise<void>;
  createMockPush: (mediaId: number, amount: string) => Promise<void>;
  challengeMockPush: (pushId: number, challengerMediaId: number, amount: string) => Promise<void>;
  claimReward: (claim: ClaimRecord) => Promise<void>;
  claimMockReward: (claim: ClaimRecord) => Promise<void>;
};

const PalateContext = createContext<PalateContextValue | null>(null);
const mockWalletAddress = mock_summary.walletAddress;
const pending_registration_storage_key = "palate_pending_registrations_v1";
const delete_pending_storage_key = "palate_delete_pending_v1";
const chain_read_cache_key = "palate_chain_read_snapshot_v1";

const initial_upload_recovery_state: UploadRecoveryState = {
  canRetry: false,
  retryCount: 0,
  error: null,
  shelbyRegistrationHash: null,
  blobName: null,
  ownerAddress: null,
  contentHash: null,
  fileName: null
};

const initial_chain_read_state: ChainReadState = {
  status: "idle",
  networkLabel: app_config.networkLabel,
  moduleAddress: app_config.moduleAddress,
  moduleName: app_config.moduleName,
  categories: null,
  treasuryAddress: null,
  protocolConfig: null,
  warning: null,
  error: null
};

const loading_balance: PalateBalance = {
  availableBalance: "Loading",
  totalDeposited: "Loading",
  totalWithdrawn: "Loading",
  lockedPushAmount: "Loading",
  lockedBuffAmount: "Loading",
  lockedCommitmentAmount: "Loading",
  totalClaimed: "Loading"
};

const unavailable_balance: PalateBalance = {
  availableBalance: "Unavailable",
  totalDeposited: "Unavailable",
  totalWithdrawn: "Unavailable",
  lockedPushAmount: "Unavailable",
  lockedBuffAmount: "Unavailable",
  lockedCommitmentAmount: "Unavailable",
  totalClaimed: "Unavailable"
};

const loading_summary: UserSummary = {
  walletAddress: "",
  claimableAmount: "Loading",
  pushProfit: "Loading",
  buffProfit: "Loading",
  totalPushed: "Loading",
  totalBuffed: "Loading",
  pushWinRate: "Loading",
  buffWinRate: "Loading",
  pushCount: "Loading",
  pushWins: "Loading",
  pushLosses: "Loading",
  buffCount: "Loading",
  buffWins: "Loading",
  buffLosses: "Loading",
  pendingBuffs: "Loading",
  skipPenalty: "Loading"
};

const unavailable_summary: UserSummary = {
  walletAddress: "",
  claimableAmount: "Unavailable",
  pushProfit: "Unavailable",
  buffProfit: "Unavailable",
  totalPushed: "Unavailable",
  totalBuffed: "Unavailable",
  pushWinRate: "Unavailable",
  buffWinRate: "Unavailable",
  pushCount: "Unavailable",
  pushWins: "Unavailable",
  pushLosses: "Unavailable",
  buffCount: "Unavailable",
  buffWins: "Unavailable",
  buffLosses: "Unavailable",
  pendingBuffs: "Unavailable",
  skipPenalty: "Unavailable"
};

function parseApt(value: string) {
  const parsed = Number.parseFloat(value.replace("APT", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatApt(value: number) {
  return `${Math.max(0, value).toFixed(3)} APT`;
}

function normalizeAddress(address: string | null | undefined) {
  return address?.trim().toLowerCase() ?? null;
}

function delay(ms = 420) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getMinChallengeAmount(pushAmount: string) {
  return formatApt(parseApt(pushAmount) * 1.05);
}

function getMimeType(format: MediaFormat) {
  if (format === "PNG") return "image/png";
  if (format === "WEBP") return "image/webp";
  if (format === "GIF") return "image/gif";
  if (format === "MP3") return "audio/mpeg";
  if (format === "WAV") return "audio/wav";
  if (format === "OGG") return "audio/ogg";
  if (format === "M4A") return "audio/mp4";
  if (format === "MP4") return "video/mp4";
  if (format === "WEBM") return "video/webm";
  if (format === "MOV") return "video/quicktime";
  return "image/jpeg";
}

function getAccentForCategory(category: MediaCategory): MediaRecord["accent"] {
  if (category === "meme") return "pink";
  if (category === "image") return "rose";
  if (category === "audio") return "deep";
  return "purple";
}

function createLocalRecoveryId() {
  return -Math.abs(Date.now() + Math.floor(Math.random() * 1000));
}

function getFormatFromMimeType(mimeType: string): MediaFormat {
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

function normalizePendingRegistrations(value: unknown): MediaRecord[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Partial<MediaRecord> => typeof item === "object" && item !== null)
    .filter((item) => item.source === "palate_upload_recovery" && typeof item.shelbyBlobRef === "string")
    .map((item) => ({
      id: typeof item.id === "number" ? item.id : createLocalRecoveryId(),
      palateMediaId: null,
      source: "palate_upload_recovery",
      ownerAddress: String(item.ownerAddress ?? ""),
      title: String(item.title ?? item.originalFileName ?? "Unregistered media"),
      category: (item.category === "meme" || item.category === "image" || item.category === "audio" || item.category === "video") ? item.category : "image",
      format: item.format ?? getFormatFromMimeType(String(item.mimeType ?? "")),
      status: item.status === "pending_registration" ? "pending_registration" : "registration_failed",
      storageStatus: "uploaded",
      createdTime: String(item.createdTime ?? "Pending registration"),
      shelbyBlobRef: String(item.shelbyBlobRef ?? ""),
      displayUrl: item.displayUrl ? String(item.displayUrl) : undefined,
      contentHash: String(item.contentHash ?? ""),
      mimeType: String(item.mimeType ?? "application/octet-stream"),
      originalFileName: item.originalFileName ? String(item.originalFileName) : undefined,
      fileSize: typeof item.fileSize === "number" ? item.fileSize : undefined,
      shelbyRegistrationHash: item.shelbyRegistrationHash ? String(item.shelbyRegistrationHash) : null,
      registrationError: item.registrationError ? String(item.registrationError) : null,
      registrationRetryCount: typeof item.registrationRetryCount === "number" ? item.registrationRetryCount : 0,
      createdTimeSeconds: item.createdTimeSeconds ? String(item.createdTimeSeconds) : undefined,
      accent: item.accent ?? getAccentForCategory((item.category === "meme" || item.category === "image" || item.category === "audio" || item.category === "video") ? item.category : "image")
    }));
}

function normalizeDeletePending(value: unknown): DeletePendingRecord[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Partial<DeletePendingRecord> => typeof item === "object" && item !== null)
    .filter((item) =>
      typeof item.ownerAddress === "string"
        && typeof item.mediaId === "number"
        && typeof item.shelbyBlobRef === "string"
        && typeof item.title === "string"
    )
    .map((item) => ({
      ownerAddress: String(item.ownerAddress),
      mediaId: Number(item.mediaId),
      shelbyBlobRef: String(item.shelbyBlobRef),
      title: String(item.title),
      status: "delete_pending"
    }));
}

function isMockMediaRecord(media: MediaRecord) {
  return media.shelbyBlobRef.startsWith("mock://") || media.contentHash.startsWith("mock_hash_");
}

function assertNoMockDataInConnectedMode(input: {
  connected: boolean;
  balance: PalateBalance;
  mediaRecords: MediaRecord[];
  waitingPushes: WaitingPush[];
  activeMatches: ActiveMatch[];
  claimRecords: ClaimRecord[];
  userSummary: UserSummary;
}) {
  if (!input.connected || process.env.NODE_ENV === "production") {
    return;
  }

  const hasMockMedia = input.mediaRecords.some(isMockMediaRecord)
    || input.waitingPushes.some((push) => isMockMediaRecord(push.media))
    || input.activeMatches.some((match) => isMockMediaRecord(match.mediaA) || isMockMediaRecord(match.mediaB));
  const hasMockBalance = input.balance.availableBalance === mock_balance.availableBalance;
  const hasMockSummary = input.userSummary.walletAddress === mock_summary.walletAddress;

  if (hasMockMedia || hasMockBalance || hasMockSummary) {
    console.warn("[Palate connected-mode boundary] Mock data detected in connected mode.", {
      hasMockMedia,
      hasMockBalance,
      hasMockSummary
    });
  }
}

export function PalateProvider({ children }: { children: ReactNode }) {
  const { signAndSubmitTransaction, walletAddress, walletStatus: walletConnectionStatus } = usePalateWallet();
  const connectedWalletReady = walletConnectionStatus === "connected" && Boolean(walletAddress);
  const disconnectedPreviewMode = walletConnectionStatus === "disconnected";
  const [walletStatus, setWalletStatus] = useState<WalletStatus>("disconnected");
  const [balance, setBalance] = useState<PalateBalance>(loading_balance);
  const [mediaRecords, setMediaRecords] = useState<MediaRecord[]>([]);
  const [pendingRegistrationMedia, setPendingRegistrationMedia] = useState<MediaRecord[]>([]);
  const [pendingRegistrationStorageLoaded, setPendingRegistrationStorageLoaded] = useState(false);
  const [deletePendingRecords, setDeletePendingRecords] = useState<DeletePendingRecord[]>([]);
  const [deletePendingStorageLoaded, setDeletePendingStorageLoaded] = useState(false);
  const [contentUnavailableIds, setContentUnavailableIds] = useState<number[]>([]);
  const [shelbyCleanupRequiredIds, setShelbyCleanupRequiredIds] = useState<number[]>([]);
  const [waitingPushes, setWaitingPushes] = useState<WaitingPush[]>([]);
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [claimRecords, setClaimRecords] = useState<ClaimRecord[]>([]);
  const [activityTransactions, setActivityTransactions] = useState<PalateActivityTransaction[]>([]);
  const [userSummary, setUserSummary] = useState<UserSummary>({ ...loading_summary, walletAddress: walletAddress ?? "" });
  const [currentAssignment, setCurrentAssignment] = useState<BuffAssignment | null>(null);
  const [completedBuffSide, setCompletedBuffSide] = useState<BuffSide | null>(null);
  const [noValidMatchAvailable, setNoValidMatchAvailable] = useState(false);
  const [usedMatchIds, setUsedMatchIds] = useState<number[]>([]);
  const [assignmentCursor, setAssignmentCursor] = useState(0);
  const [uploadStep, setUploadStep] = useState<UploadStep | null>(null);
  const [uploadRecovery, setUploadRecovery] = useState<UploadRecoveryState>(initial_upload_recovery_state);
  const [mediaReadStatus, setMediaReadStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [claimReadStatus, setClaimReadStatus] = useState<"idle" | "loading" | "ready" | "error">(connectedWalletReady ? "idle" : "ready");
  const [palateBalanceReadStatus, setPalateBalanceReadStatus] = useState<"idle" | "loading" | "ready" | "error">(connectedWalletReady ? "loading" : "idle");
  const [userSummaryReadStatus, setUserSummaryReadStatus] = useState<"idle" | "loading" | "ready" | "error">(connectedWalletReady ? "loading" : "idle");
  const [activityReadStatus, setActivityReadStatus] = useState<"idle" | "loading" | "ready" | "error">(connectedWalletReady ? "loading" : "idle");
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [chainRead, setChainRead] = useState<ChainReadState>(initial_chain_read_state);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(pending_registration_storage_key);
      setPendingRegistrationMedia(stored ? normalizePendingRegistrations(JSON.parse(stored)) : []);
    } catch {
      setPendingRegistrationMedia([]);
    } finally {
      setPendingRegistrationStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!pendingRegistrationStorageLoaded) return;
    window.localStorage.setItem(pending_registration_storage_key, JSON.stringify(pendingRegistrationMedia));
  }, [pendingRegistrationMedia, pendingRegistrationStorageLoaded]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(delete_pending_storage_key);
      setDeletePendingRecords(stored ? normalizeDeletePending(JSON.parse(stored)) : []);
    } catch {
      setDeletePendingRecords([]);
    } finally {
      setDeletePendingStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!deletePendingStorageLoaded) return;
    window.localStorage.setItem(delete_pending_storage_key, JSON.stringify(deletePendingRecords));
  }, [deletePendingRecords, deletePendingStorageLoaded]);

  useEffect(() => {
    let cancelled = false;

    const cachedSnapshot = (() => {
      try {
        const stored = window.localStorage.getItem(chain_read_cache_key);
        if (!stored) return null;
        return JSON.parse(stored) as Pick<ChainReadState, "categories" | "treasuryAddress" | "protocolConfig">;
      } catch {
        return null;
      }
    })();

    async function loadChainReadState() {
      setChainRead((current) => ({ ...current, status: "loading", warning: null, error: null }));

      try {
        const snapshot = await getChainReadSnapshot();

        if (cancelled) return;

        setChainRead((current) => ({
          ...current,
          status: "ready",
          categories: snapshot.categories,
          treasuryAddress: snapshot.treasuryAddress,
          protocolConfig: snapshot.protocolConfig,
          warning: snapshot.warning,
          error: null
        }));
        window.localStorage.setItem(chain_read_cache_key, JSON.stringify({
          categories: snapshot.categories,
          treasuryAddress: snapshot.treasuryAddress,
          protocolConfig: snapshot.protocolConfig
        }));
      } catch {
        if (cancelled) return;

        if (cachedSnapshot?.protocolConfig) {
          setChainRead((current) => ({
            ...current,
            status: "ready",
            categories: cachedSnapshot.categories ?? null,
            treasuryAddress: cachedSnapshot.treasuryAddress ?? null,
            protocolConfig: cachedSnapshot.protocolConfig,
            warning: "Using last read",
            error: null
          }));
          return;
        }

        setChainRead((current) => ({
          ...current,
          status: "error",
          warning: null,
          error: "Contract read temporarily unavailable"
        }));
      }
    }

    loadChainReadState();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateAvailableBalance(nextAmount: number) {
    setBalance((current) => ({ ...current, availableBalance: formatApt(nextAmount) }));
  }

  function getAvailableBalanceNumber() {
    return parseApt(balance.availableBalance);
  }

  function getRequiredConfigAmount(field: "minPushAmount" | "minBuffAmount") {
    const value = chainRead.protocolConfig?.[field];
    if (!value) {
      throw new Error("Protocol config is still loading. Try again in a moment.");
    }
    return BigInt(value);
  }

  function getMinimumChallengeAmountOctas(push: WaitingPush) {
    if (push.minChallengeAmountOctas) {
      return BigInt(push.minChallengeAmountOctas);
    }

    return BigInt(parseAptToOctas(push.minChallengeAmount));
  }

  function subtractAvailableBalance(amount: number) {
    updateAvailableBalance(getAvailableBalanceNumber() - amount);
  }

  async function runMockAction(actionName: string, action: () => void | Promise<void>) {
    setProcessingAction(actionName);
    setFeedback(null);
    await delay();
    await action();
    setProcessingAction(null);
  }

  const refreshPalateBalanceForWallet = useCallback(async (ownerAddress: string) => {
    const finishPerf = startUiPerf("refreshPalateBalanceForWallet", { ownerAddress });
    setPalateBalanceReadStatus("loading");
    try {
      const nextBalance = await getPalateBalance(ownerAddress);
      setBalance(nextBalance);
      setPalateBalanceReadStatus("ready");
      finishPerf("success", { availableBalance: nextBalance.availableBalance });
    } catch (error) {
      console.error("[Palate balance read failed]", error);
      setBalance(unavailable_balance);
      setPalateBalanceReadStatus("error");
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }, []);

  async function refreshUserMediaForWallet(ownerAddress: string) {
    setMediaReadStatus("loading");
    try {
      const nextMedia = await getUserMedia(ownerAddress);
      setMediaRecords(nextMedia);
      setMediaReadStatus("ready");
    } catch (error) {
      setMediaReadStatus("error");
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to load My Media from chain." });
    }
  }

  const refreshClaimsForWallet = useCallback(async (ownerAddress: string) => {
    const finishPerf = startUiPerf("refreshClaimsForWallet", { ownerAddress });
    setClaimReadStatus("loading");
    try {
      const nextClaimRecords = await readClaimRecords(ownerAddress);
      if (app_config.debugAptosReads) {
        console.info("[Palate claim records]", nextClaimRecords.map((record) => ({
          claimKey: record.claimKey,
          matchId: record.matchId,
          type: record.type,
          claimable: record.claimable,
          claimed: record.claimed,
          amount: record.amount
        })));
      }
      setClaimRecords(nextClaimRecords);
      setClaimReadStatus("ready");
      const nextClaimableSummary = getClaimableRewardsSummary(nextClaimRecords);
      setUserSummary((current) => ({
        ...current,
        claimableAmount: formatOctasToApt(nextClaimableSummary.claimableTotalOctas)
      }));
      finishPerf("success", {
        count: nextClaimRecords.length,
        claimableCount: nextClaimableSummary.claimableCount
      });
    } catch (error) {
      console.error("[Claim discovery read failed]", error);
      setClaimReadStatus("error");
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  const refreshUserSummaryForWallet = useCallback(async (ownerAddress: string) => {
    const finishPerf = startUiPerf("refreshUserSummaryForWallet", { ownerAddress });
    setUserSummaryReadStatus("loading");
    try {
      const nextSummary = await readUserSummary(ownerAddress);
      setUserSummary(nextSummary);
      setUserSummaryReadStatus("ready");
      finishPerf("success", {
        pushCount: nextSummary.pushCount,
        buffCount: nextSummary.buffCount
      });
    } catch (error) {
      console.error("[User summary read failed]", error);
      setUserSummaryReadStatus("error");
      setUserSummary((current) => {
        const hasLoadingFields = Object.values(current).some((value) => value === "Loading");
        if (!current.walletAddress || hasLoadingFields) {
          return {
            ...unavailable_summary,
            walletAddress: ownerAddress
          };
        }

        return current;
      });
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  const refreshActivityTransactionsForWallet = useCallback(async (ownerAddress: string) => {
    const finishPerf = startUiPerf("refreshActivityTransactionsForWallet", { ownerAddress });
    setActivityReadStatus("loading");
    try {
      const nextTransactions = await getPalateTransactionLog(ownerAddress, { limit: 80 });
      setActivityTransactions(nextTransactions);
      setActivityReadStatus("ready");
      finishPerf("success", { count: nextTransactions.length });
    } catch (error) {
      console.error("[Activity transaction read failed]", error);
      setActivityReadStatus("error");
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
    }
  }, []);

  const refreshDeferredWalletState = useCallback(async (ownerAddress: string) => {
    const finishPerf = startUiPerf("refreshDeferredWalletState", { ownerAddress });
    setUserSummary((current) => ({
      ...current,
      walletAddress: ownerAddress
    }));
    setMediaReadStatus("loading");

    const [nextSummary, nextMedia, nextWaitingPushes, nextActiveMatches, nextAssignment] = await Promise.allSettled([
      readUserSummary(ownerAddress),
      getUserMedia(ownerAddress),
      readWaitingPushes(),
      readActiveMatches(),
      readCurrentAssignment(ownerAddress)
    ]);

    if (nextSummary.status === "fulfilled") {
      setUserSummary(nextSummary.value);
      setUserSummaryReadStatus("ready");
    } else {
      console.error("[User summary read failed]", nextSummary.reason);
      setUserSummaryReadStatus("error");
      setUserSummary((current) => {
        const hasLoadingFields = Object.values(current).some((value) => value === "Loading");
        if (!current.walletAddress || hasLoadingFields) {
          return {
            ...unavailable_summary,
            walletAddress: ownerAddress
          };
        }

        return current;
      });
    }

    if (nextMedia.status === "fulfilled") {
      setMediaRecords(nextMedia.value);
      setMediaReadStatus("ready");
    } else {
      console.error("[User media read failed]", nextMedia.reason);
      setMediaReadStatus("error");
    }

    if (nextWaitingPushes.status === "fulfilled") {
      setWaitingPushes(nextWaitingPushes.value);
    } else {
      console.error("[Waiting pushes read failed]", nextWaitingPushes.reason);
    }

    if (nextActiveMatches.status === "fulfilled") {
      setActiveMatches(nextActiveMatches.value);
    } else {
      console.error("[Active matches read failed]", nextActiveMatches.reason);
    }

    if (nextAssignment.status === "fulfilled") {
      setCurrentAssignment(nextAssignment.value);
    } else {
      console.error("[Assignment read failed]", nextAssignment.reason);
    }

    finishPerf("success", {
      summary: nextSummary.status,
      media: nextMedia.status,
      mediaCount: nextMedia.status === "fulfilled" ? nextMedia.value.length : 0,
      waitingPushes: nextWaitingPushes.status,
      waitingPushCount: nextWaitingPushes.status === "fulfilled" ? nextWaitingPushes.value.length : 0,
      activeMatches: nextActiveMatches.status,
      activeMatchCount: nextActiveMatches.status === "fulfilled" ? nextActiveMatches.value.length : 0,
      assignment: nextAssignment.status
    });
  }, []);

  const refreshWalletGameState = useCallback(async (ownerAddress: string) => {
    const finishPerf = startUiPerf("refreshWalletGameState", { ownerAddress });
    try {
      await refreshPalateBalanceForWallet(ownerAddress);
      await refreshDeferredWalletState(ownerAddress);
      finishPerf("success");
    } catch (error) {
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }, [refreshDeferredWalletState, refreshPalateBalanceForWallet]);

  const refreshProfileActivityForWallet = useCallback(async (ownerAddress: string) => {
    const finishPerf = startUiPerf("refreshProfileActivityForWallet", { ownerAddress });
    try {
      const [transactionResult] = await Promise.allSettled([
        refreshActivityTransactionsForWallet(ownerAddress)
      ]);

      if (transactionResult.status === "rejected") {
        finishPerf("error", { reason: "Profile activity refresh did not complete cleanly." });
        throw new Error("Profile activity refresh did not complete cleanly.");
      }

      finishPerf("success");
    } catch (error) {
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }, [refreshActivityTransactionsForWallet]);

  useEffect(() => {
    if (walletConnectionStatus !== "connected" || !walletAddress) return;

    let cancelled = false;
    let deferredRefreshTimer: number | null = null;
    const ownerAddress = walletAddress;

    async function refreshOnWalletConnect() {
      const finishPerf = startUiPerf("refreshOnWalletConnect", { ownerAddress });
      try {
        if (!cancelled) {
          setBalance(loading_balance);
          setMediaRecords([]);
          setWaitingPushes([]);
          setActiveMatches([]);
          setCurrentAssignment(null);
          setClaimRecords([]);
          setActivityTransactions([]);
          setMediaReadStatus("idle");
          setClaimReadStatus("idle");
          setPalateBalanceReadStatus("loading");
          setUserSummaryReadStatus("loading");
          setActivityReadStatus("idle");
          setUserSummary({ ...loading_summary, walletAddress: ownerAddress });
          await refreshPalateBalanceForWallet(ownerAddress);
          await refreshUserSummaryForWallet(ownerAddress);
          deferredRefreshTimer = window.setTimeout(() => {
            if (cancelled) return;
            const finishDeferredPerf = startUiPerf("refreshOnWalletConnect:deferredReads", { ownerAddress });
            void Promise.allSettled([
              refreshDeferredWalletState(ownerAddress),
              refreshClaimsForWallet(ownerAddress)
            ]).then((results) => {
              if (cancelled) return;
              if (results.some((result) => result.status === "rejected")) {
                setFeedback({ type: "info", message: "Using last read." });
              }
              finishDeferredPerf("success", {
                results: results.map((result) => result.status).join(",")
              });
            });
          }, 350);
          finishPerf("success");
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback({ type: "error", message: "Some on-chain data is temporarily unavailable." });
        }
        finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
      }
    }

    refreshOnWalletConnect();

    return () => {
      cancelled = true;
      if (deferredRefreshTimer !== null) {
        window.clearTimeout(deferredRefreshTimer);
      }
    };
  }, [
    refreshClaimsForWallet,
    refreshDeferredWalletState,
    refreshPalateBalanceForWallet,
    refreshUserSummaryForWallet,
    walletAddress,
    walletConnectionStatus
  ]);

  async function runBalanceTransaction(actionName: "deposit" | "withdraw", amount: string) {
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      setFeedback({ type: "error", message: "Connect wallet to manage Palate Balance." });
      return;
    }

    setProcessingAction(actionName);
    setFeedback(null);

    try {
      const amountOctas = parseAptToOctas(amount);

      if (actionName === "withdraw") {
        const availableOctas = BigInt(parseAptToOctas(balance.availableBalance, { allowZero: true }));
        if (BigInt(amountOctas) > availableOctas) {
          setFeedback({ type: "error", message: "Withdraw rejected: amount exceeds available Palate Balance." });
          return;
        }
      }

      const data = actionName === "deposit" ? buildDepositBalancePayload(amountOctas) : buildWithdrawBalancePayload(amountOctas);
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Transaction submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshPalateBalanceForWallet(walletAddress);
      setFeedback({
        type: "success",
        message: `${actionName === "deposit" ? "Deposit" : "Withdraw"} confirmed ${shortenTransactionHash(transactionHash)}.`
      });
    } catch (error) {
      console.error(`${actionName}Balance failed`, error);
      setFeedback({ type: "error", message: getReadablePalateError(error, "Transaction failed.") });
    } finally {
      setProcessingAction(null);
    }
  }

  function getShelbyUploadErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "Shelby upload failed.");
    if (message.includes("500") || message.toLowerCase().includes("internal server error")) {
      return "Shelby upload failed. Your media was saved as a failed upload in Palate and can be deleted from My Media.";
    }
    return "Shelby upload failed. Your media was saved as a failed upload in Palate and can be deleted from My Media.";
  }

  function getPalateRegistrationErrorMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error ?? "Palate registration failed.");
    return message || "Palate registration failed.";
  }

  function addPendingRegistrationMedia(draft: UploadRetryDraft, shelbyResult: Awaited<ReturnType<typeof uploadPreparedBlobToShelby>>, error: unknown) {
    const registrationError = getPalateRegistrationErrorMessage(error);
    const pendingMedia: MediaRecord = {
      id: createLocalRecoveryId(),
      palateMediaId: null,
      source: "palate_upload_recovery",
      ownerAddress: draft.registeredUpload.ownerAddress,
      title: draft.title,
      category: draft.category,
      format: draft.format,
      status: "registration_failed",
      storageStatus: "uploaded",
      createdTime: "Registration failed",
      createdTimeSeconds: draft.createdTimeSeconds,
      shelbyBlobRef: shelbyResult.shelbyBlobRef,
      displayUrl: shelbyResult.displayUrl,
      contentHash: shelbyResult.contentHash,
      mimeType: shelbyResult.mimeType,
      originalFileName: shelbyResult.originalFileName,
      fileSize: shelbyResult.size,
      shelbyRegistrationHash: draft.registeredUpload.shelbyRegistrationHash,
      registrationError,
      registrationRetryCount: 0,
      accent: getAccentForCategory(draft.category)
    };

    setPendingRegistrationMedia((records) => {
      const withoutDuplicate = records.filter((record) => record.shelbyBlobRef !== pendingMedia.shelbyBlobRef);
      return [pendingMedia, ...withoutDuplicate];
    });
  }

  function resetUploadFlow() {
    setUploadStep("idle");
    setUploadRecovery(initial_upload_recovery_state);
    setProcessingAction(null);
    setFeedback(null);
  }

  async function registerPalateMediaAfterShelbyUpload(draft: UploadRetryDraft, shelbyResult: Awaited<ReturnType<typeof uploadPreparedBlobToShelby>>) {
    if (!walletAddress) {
      throw new Error("Connect wallet to register media on chain.");
    }

    setUploadStep("shelby_uploaded");
    setFeedback({ type: "success", message: "Shelby upload completed. Continue with Palate registration." });
    setUploadStep("registering_palate_media");

    const data = buildRegisterMediaPayload({
      category: draft.category,
      shelbyBlobRef: shelbyResult.shelbyBlobRef,
      contentHash: shelbyResult.contentHash,
      mimeType: shelbyResult.mimeType,
      title: draft.title,
      createdTime: draft.createdTimeSeconds,
      categoryConstants: chainRead.categories
    });

    try {
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Registration submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshUserMediaForWallet(walletAddress);
      setUploadStep("completed");
      setUploadRecovery(initial_upload_recovery_state);
      setFeedback({ type: "success", message: `Media registered in Palate ${shortenTransactionHash(transactionHash)}.` });
    } catch (error) {
      console.error("Palate registerMedia failed after Shelby upload", error);
      addPendingRegistrationMedia(draft, shelbyResult, error);
      setUploadStep("failed");
      setUploadRecovery(initial_upload_recovery_state);
      setFeedback({
        type: "error",
        message: "Palate registration failed after Shelby upload. The item is saved in My Media for retry."
      });
    }
  }

  async function registerFailedMediaAfterShelbyUploadFailure(draft: UploadRetryDraft, error: unknown) {
    if (!walletAddress) {
      throw new Error("Connect wallet to register failed media on chain.");
    }

    const message = getShelbyUploadErrorMessage(error);
    setUploadStep("shelby_upload_failed");
    setFeedback({ type: "info", message: "Shelby upload failed. Registering the failed media record in Palate." });

    const data = buildRegisterShelbyUploadFailedMediaPayload({
      category: draft.category,
      shelbyBlobRef: draft.registeredUpload.blobName,
      contentHash: draft.registeredUpload.contentHash,
      mimeType: draft.registeredUpload.mimeType,
      title: draft.title,
      createdTime: draft.createdTimeSeconds,
      categoryConstants: chainRead.categories
    });
    const transactionHash = await signAndSubmitTransaction({ data });
    setFeedback({ type: "info", message: `Failed media registration submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
    await waitForPalateTransaction(transactionHash);
    await refreshUserMediaForWallet(walletAddress);
    setUploadRecovery(initial_upload_recovery_state);
    setFeedback({
      type: "error",
      message: `${message} A failed media item was saved in My Media and can be deleted.`
    });
  }

  async function uploadShelbyRpcThenRegisterPalate(draft: UploadRetryDraft) {
    setUploadStep("uploading_to_shelby");
    let shelbyResult: Awaited<ReturnType<typeof uploadPreparedBlobToShelby>>;

    try {
      shelbyResult = await uploadPreparedBlobToShelby(draft.registeredUpload);
    } catch (error) {
      console.error("Shelby RPC upload failed", error);
      await registerFailedMediaAfterShelbyUploadFailure(draft, error);
      return;
    }

    await registerPalateMediaAfterShelbyUpload(draft, shelbyResult);
  }

  async function findMatchOnChain() {
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      await runMockAction("findMatch", () => {
        if (currentAssignment) {
          setFeedback({ type: "error", message: "Complete or skip the current assignment before finding another match." });
          return;
        }
        const validMatches = activeMatches.filter((match) => match.status === "active" && !usedMatchIds.includes(match.id));
        if (validMatches.length === 0) {
          setNoValidMatchAvailable(true);
          setCompletedBuffSide(null);
          setFeedback({ type: "error", message: "No valid match is available." });
          return;
        }
        const nextMatch = validMatches[assignmentCursor % validMatches.length];
        setAssignmentCursor((cursor) => cursor + 1);
        setCurrentAssignment({
          match: nextMatch,
          assignedAt: "Just now",
          commitmentAmount: "0.500 APT",
          skipPenaltyAmount: userSummary.skipPenalty
        });
        setCompletedBuffSide(null);
        setNoValidMatchAvailable(false);
        setFeedback({ type: "success", message: "Match assigned. Choose Buff A or Buff B." });
      });
      return;
    }

    if (currentAssignment) {
      setFeedback({ type: "error", message: "Complete or skip the current assignment before finding another match." });
      return;
    }

    setProcessingAction("findMatch");
    setFeedback(null);

    try {
      const data = buildFindMatchPayload();
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Find Match submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshWalletGameState(walletAddress);
      setCompletedBuffSide(null);
      setNoValidMatchAvailable(false);
      setFeedback({ type: "success", message: `Match assigned ${shortenTransactionHash(transactionHash)}.` });
    } catch (error) {
      console.error("findMatch failed", error);
      setFeedback({ type: "error", message: getReadablePalateError(error, "Find Match failed.") });
    } finally {
      setProcessingAction(null);
    }
  }

  async function placeBuffOnChain(side: BuffSide, amount: string) {
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      await runMockAction("placeBuff", () => {
        let buffAmountOctas: string;
        try {
          buffAmountOctas = parseAptToOctas(amount);
        } catch (error) {
          setFeedback({ type: "error", message: error instanceof Error ? error.message : "Enter a valid Buff amount." });
          return;
        }
        const buffAmount = parseApt(amount);
        if (!currentAssignment) {
          setFeedback({ type: "error", message: "Find Match before placing a Buff." });
          return;
        }
        let minBuffAmount: bigint;
        try {
          minBuffAmount = getRequiredConfigAmount("minBuffAmount");
        } catch (error) {
          setFeedback({ type: "error", message: error instanceof Error ? error.message : "Protocol config is still loading." });
          return;
        }
        if (BigInt(buffAmountOctas) < minBuffAmount) {
          setFeedback({ type: "error", message: `Minimum Buff is ${formatOctasToApt(minBuffAmount)}.` });
          return;
        }
        if (buffAmount > getAvailableBalanceNumber()) {
          setFeedback({ type: "error", message: "Buff rejected: insufficient Palate Balance." });
          return;
        }
        subtractAvailableBalance(buffAmount);
        setUsedMatchIds((ids) => [...ids, currentAssignment.match.id]);
        setCompletedBuffSide(side);
        setCurrentAssignment(null);
        setNoValidMatchAvailable(false);
        setFeedback({ type: "success", message: `Buff ${side} recorded. Result remains hidden until settlement.` });
      });
      return;
    }

    if (!currentAssignment) {
      setFeedback({ type: "error", message: "Find Match before placing a Buff." });
      return;
    }

    let buffAmountOctas: string;
    try {
      buffAmountOctas = parseAptToOctas(amount);
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Enter a valid Buff amount." });
      return;
    }

    const buffAmount = parseApt(amount);
    let minBuffAmount: bigint;
    try {
      minBuffAmount = getRequiredConfigAmount("minBuffAmount");
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Protocol config is still loading." });
      return;
    }

    if (BigInt(buffAmountOctas) < minBuffAmount) {
      setFeedback({ type: "error", message: `Minimum Buff is ${formatOctasToApt(minBuffAmount)}.` });
      return;
    }

    if (buffAmount > getAvailableBalanceNumber()) {
      setFeedback({ type: "error", message: "Buff rejected: insufficient Palate Balance." });
      return;
    }

    setProcessingAction("placeBuff");
    setFeedback(null);

    try {
      const data = buildPlaceBuffPayload(side, buffAmountOctas);
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Buff submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshWalletGameState(walletAddress);
      setCompletedBuffSide(side);
      setNoValidMatchAvailable(false);
      setFeedback({ type: "success", message: `Buff ${side} confirmed ${shortenTransactionHash(transactionHash)}.` });
    } catch (error) {
      console.error("placeBuff failed", error);
      setFeedback({ type: "error", message: getReadablePalateError(error, "Buff failed.") });
    } finally {
      setProcessingAction(null);
    }
  }

  async function skipMatchOnChain() {
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      await runMockAction("skipMatch", () => {
        if (!currentAssignment) {
          setFeedback({ type: "error", message: "There is no assignment to skip." });
          return;
        }
        const penalty = parseApt(currentAssignment.skipPenaltyAmount);
        subtractAvailableBalance(Math.min(penalty, getAvailableBalanceNumber()));
        setCurrentAssignment(null);
        setCompletedBuffSide(null);
        setFeedback({ type: "info", message: `Skip Match applied a ${formatApt(penalty)} penalty and cleared the assignment.` });
      });
      return;
    }

    if (!currentAssignment) {
      setFeedback({ type: "error", message: "There is no assignment to skip." });
      return;
    }

    setProcessingAction("skipMatch");
    setFeedback(null);

    try {
      const data = buildSkipMatchPayload();
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Skip Match submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshWalletGameState(walletAddress);
      setCompletedBuffSide(null);
      setNoValidMatchAvailable(false);
      setFeedback({ type: "success", message: `Skip Match confirmed ${shortenTransactionHash(transactionHash)}.` });
    } catch (error) {
      console.error("skipMatch failed", error);
      setFeedback({ type: "error", message: getReadablePalateError(error, "Skip Match failed.") });
    } finally {
      setProcessingAction(null);
    }
  }

  async function settleMatchOnChain(matchId: number) {
    const finishPerf = startUiPerf("settleMatchOnChain", { matchId });
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      setFeedback({ type: "error", message: "Connect wallet to settle the match." });
      finishPerf("end", { skipped: true, reason: "wallet not connected" });
      return;
    }

    setProcessingAction("settleMatch");
    setFeedback(null);

    try {
      const data = buildSettleMatchPayload(matchId);
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Settle Match submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshWalletGameState(walletAddress);
      await refreshClaimsForWallet(walletAddress);
      setFeedback({ type: "success", message: `Match settled ${shortenTransactionHash(transactionHash)}. Check Profile Claims for rewards.` });
      finishPerf("success", { transactionHash, refreshedClaims: true, refreshedGameState: true });
    } catch (error) {
      console.error("settleMatch failed", error);
      setFeedback({ type: "error", message: getReadablePalateError(error, "Settle Match failed.") });
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
    } finally {
      setProcessingAction(null);
    }
  }

  async function claimRewardOnChain(claim: ClaimRecord) {
    const finishPerf = startUiPerf("claimRewardOnChain", { claimKey: claim.claimKey, claimType: claim.type });
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      setFeedback({ type: "error", message: "Connect wallet to claim rewards." });
      finishPerf("end", { skipped: true, reason: "wallet not connected" });
      return;
    }

    if (!claim.matchId) {
      setFeedback({ type: "error", message: "Claim is not available." });
      finishPerf("end", { skipped: true, reason: "missing match id" });
      return;
    }
    if (!claim.settled || claim.claimed || !claim.claimable || BigInt(claim.claimableAmountOctas) <= BigInt(0)) {
      setFeedback({ type: "error", message: "Claim is not available." });
      finishPerf("end", { skipped: true, reason: "claim unavailable" });
      return;
    }

    setProcessingAction("claimReward");
    setFeedback(null);

    try {
      const data = buildClaimRewardPayload({ type: claim.type, matchId: claim.matchId });
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Claim submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshWalletGameState(walletAddress);
      await refreshClaimsForWallet(walletAddress);
      setFeedback({ type: "success", message: `${claim.type === "buff" ? "Buff" : "Push"} reward credited to Palate Balance ${shortenTransactionHash(transactionHash)}.` });
      finishPerf("success", { transactionHash, refreshedClaims: true, refreshedGameState: true });
    } catch (error) {
      console.error("claimReward failed", error);
      setFeedback({ type: "error", message: getReadablePalateError(error, "Claim failed.") });
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
    } finally {
      setProcessingAction(null);
    }
  }

  async function registerMediaOnChain(input: UploadMediaInput) {
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      setUploadStep("failed");
      setFeedback({ type: "error", message: "Connect wallet to register media on chain." });
      return;
    }

    if (!app_config.shelby.enabled) {
      setUploadStep("failed");
      setFeedback({ type: "error", message: "Shelby API key is not configured." });
      return;
    }

    if (!input.file) {
      setUploadStep("failed");
      setFeedback({ type: "error", message: "Choose a media file before upload." });
      return;
    }

    if (!VIDEO_ENABLED && input.category === "video") {
      setUploadStep("failed");
      setFeedback({ type: "error", message: "Video uploads are temporarily disabled for MVP." });
      return;
    }

    const detectedKind = detectMediaKindFromFile(input.file);
    if (!isCategoryCompatibleWithKind(input.category, detectedKind)) {
      setUploadStep("failed");
      setFeedback({ type: "error", message: getFileCategoryMessage(input.file, input.category) ?? "Selected category does not match this file type." });
      return;
    }

    setProcessingAction("upload");
    setFeedback(null);
    setUploadRecovery(initial_upload_recovery_state);

    try {
      setUploadStep("preparing_file");
      await delay(330);
      setUploadStep("generating_commitments");

      const safeTitle = getMediaDisplayTitle({
        title: input.title,
        originalFileName: input.fileName || input.file?.name || "",
        shelbyBlobRef: "",
        displayUrl: ""
      });
      const preparedUpload = await prepareShelbyUpload(
        input.file,
        walletAddress,
        {
          title: safeTitle,
          category: input.category,
          mimeType: input.mimeType || input.file.type || getMimeType(input.format),
          originalFileName: input.fileName || input.file.name
        }
      );

      setUploadStep("registering_shelby_blob");
      const registeredUpload = await registerShelbyBlob(preparedUpload, {
        submitShelbyRegistration: async (data) => signAndSubmitTransaction({ data }),
        waitForShelbyRegistration: waitForPalateTransaction
      });

      const draft: UploadRetryDraft = {
        registeredUpload,
        category: input.category,
        format: input.format,
        title: safeTitle,
        mimeType: registeredUpload.mimeType,
        createdTimeSeconds: Math.floor(Date.now() / 1000).toString()
      };
      setUploadRecovery({
        canRetry: false,
        retryCount: 0,
        error: null,
        shelbyRegistrationHash: registeredUpload.shelbyRegistrationHash,
        blobName: registeredUpload.blobName,
        ownerAddress: registeredUpload.ownerAddress,
        contentHash: registeredUpload.contentHash,
        fileName: registeredUpload.originalFileName
      });

      await uploadShelbyRpcThenRegisterPalate(draft);
    } catch (error) {
      setUploadStep("failed");
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Media registration failed." });
    } finally {
      setProcessingAction(null);
    }
  }

  async function retryPalateRegistration(mediaId: number) {
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      setFeedback({ type: "error", message: "Connect wallet to retry Palate registration." });
      return;
    }

    const pendingMedia = pendingRegistrationMedia.find((media) => media.id === mediaId);
    if (!pendingMedia || pendingMedia.source !== "palate_upload_recovery") {
      setFeedback({ type: "error", message: "Registration retry item was not found." });
      return;
    }

    if (pendingMedia.ownerAddress && pendingMedia.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      setFeedback({ type: "error", message: "Connect the wallet that uploaded this media to retry registration." });
      return;
    }

    setProcessingAction(`retryRegistration:${mediaId}`);
    setFeedback(null);
    setPendingRegistrationMedia((records) =>
      records.map((record) =>
        record.id === mediaId
          ? { ...record, status: "pending_registration", registrationError: null }
          : record
      )
    );

    try {
      const data = buildRegisterMediaPayload({
        category: pendingMedia.category,
        shelbyBlobRef: pendingMedia.shelbyBlobRef,
        contentHash: pendingMedia.contentHash,
        mimeType: pendingMedia.mimeType,
        title: pendingMedia.title,
        createdTime: pendingMedia.createdTimeSeconds ?? Math.floor(Date.now() / 1000).toString(),
        categoryConstants: chainRead.categories
      });
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Registration submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshUserMediaForWallet(walletAddress);
      setPendingRegistrationMedia((records) => records.filter((record) => record.id !== mediaId));
      setFeedback({ type: "success", message: `Media registered in Palate ${shortenTransactionHash(transactionHash)}.` });
    } catch (error) {
      const message = getPalateRegistrationErrorMessage(error);
      setPendingRegistrationMedia((records) =>
        records.map((record) =>
          record.id === mediaId
            ? {
                ...record,
                status: "registration_failed",
                registrationError: message,
                registrationRetryCount: (record.registrationRetryCount ?? 0) + 1
              }
            : record
        )
      );
      setFeedback({ type: "error", message: "Palate registration failed. You can retry from My Media." });
    } finally {
      setProcessingAction(null);
    }
  }

  function clearPendingRegistration(mediaId: number) {
    setPendingRegistrationMedia((records) => records.filter((record) => record.id !== mediaId));
    setFeedback({ type: "info", message: "Registration recovery item cleared from this browser." });
  }

  const isDeletePendingMedia = useCallback((media: MediaRecord) => {
    const mediaId = media.palateMediaId ?? media.id;
    return deletePendingRecords.some((record) =>
      record.mediaId === mediaId
        && (!walletAddress || record.ownerAddress.toLowerCase() === media.ownerAddress.toLowerCase())
    );
  }, [deletePendingRecords, walletAddress]);

  const isContentUnavailableMedia = useCallback((media: MediaRecord) => {
    const mediaId = media.palateMediaId ?? media.id;
    return contentUnavailableIds.includes(mediaId);
  }, [contentUnavailableIds]);

  const isShelbyCleanupRequiredMedia = useCallback((media: MediaRecord) => {
    const mediaId = media.palateMediaId ?? media.id;
    return shelbyCleanupRequiredIds.includes(mediaId);
  }, [shelbyCleanupRequiredIds]);

  const applyLocalMediaState = useCallback((media: MediaRecord): MediaRecord => {
    return {
      ...media,
      deletePending: isDeletePendingMedia(media),
      contentUnavailable: isContentUnavailableMedia(media),
      shelbyCleanupRequired: isShelbyCleanupRequiredMedia(media)
    };
  }, [isContentUnavailableMedia, isDeletePendingMedia, isShelbyCleanupRequiredMedia]);

  function getPalateDeleteErrorMessage(error: unknown) {
    const rawMessage = error instanceof Error ? error.message : String(error ?? "");
    const normalized = rawMessage.toLowerCase();
    if (
      normalized.includes("delete_media")
        && (normalized.includes("not found") || normalized.includes("function") || normalized.includes("unknown"))
    ) {
      return "Contract upgrade required for Palate delete.";
    }

    return getReadablePalateError(error, "Palate delete failed.");
  }

  function markDeletePending(media: MediaRecord) {
    const mediaId = media.palateMediaId ?? media.id;
    setDeletePendingRecords((records) => {
      const nextRecord: DeletePendingRecord = {
        ownerAddress: media.ownerAddress,
        mediaId,
        shelbyBlobRef: media.shelbyBlobRef,
        title: getMediaDisplayTitle(media),
        status: "delete_pending"
      };
      return [nextRecord, ...records.filter((record) => !(record.ownerAddress.toLowerCase() === media.ownerAddress.toLowerCase() && record.mediaId === mediaId))];
    });
  }

  function markShelbyCleanupRequired(media: MediaRecord) {
    const mediaId = media.palateMediaId ?? media.id;
    setShelbyCleanupRequiredIds((ids) => (ids.includes(mediaId) ? ids : [...ids, mediaId]));
  }

  function clearShelbyCleanupRequired(media: MediaRecord) {
    const mediaId = media.palateMediaId ?? media.id;
    setShelbyCleanupRequiredIds((ids) => ids.filter((id) => id !== mediaId));
  }

  async function submitPalateDelete(media: MediaRecord) {
    const data = buildDeleteMediaPayload(media.palateMediaId ?? media.id);
    const transactionHash = await signAndSubmitTransaction({ data });
    setFeedback({ type: "info", message: `Palate delete submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
    await waitForPalateTransaction(transactionHash);
    return transactionHash;
  }

  async function submitShelbyDelete(media: MediaRecord) {
    if (media.storageStatus === "shelby_upload_failed") {
      setFeedback({ type: "info", message: "Shelby upload did not complete. Deleting Palate record directly." });
      clearShelbyCleanupRequired(media);
      return "confirmed_missing" as const;
    }

    if (!media.shelbyBlobRef?.trim() && !media.displayUrl?.trim()) {
      setFeedback({ type: "info", message: "No Shelby blob reference was found. Continuing with Palate delete." });
      clearShelbyCleanupRequired(media);
      return "confirmed_missing" as const;
    }

    if (isDeletePendingMedia(media) || isContentUnavailableMedia(media) || media.deletePending || media.contentUnavailable) {
      setFeedback({ type: "info", message: "Shelby content is already unavailable. Continuing with Palate delete." });
      clearShelbyCleanupRequired(media);
      return "confirmed_missing" as const;
    }

    const preflight = await preflightShelbyBlob(media);
    if (preflight === "missing") {
      setFeedback({ type: "info", message: "Shelby content was already removed. Continuing with Palate delete." });
      clearShelbyCleanupRequired(media);
      return "confirmed_missing" as const;
    }
    if (preflight === "inconclusive") {
      markShelbyCleanupRequired(media);
      setFeedback({ type: "error", message: "Shelby cleanup could not be confirmed. Retry Shelby delete before Palate delete." });
      return "cleanup_required" as const;
    }

    try {
      const shelbyDeleteData = buildShelbyDeleteBlobPayload(media.ownerAddress, media.shelbyBlobRef);
      const shelbyDeleteHash = await signAndSubmitTransaction({ data: shelbyDeleteData });
      setFeedback({ type: "info", message: `Shelby delete submitted ${shortenTransactionHash(shelbyDeleteHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(shelbyDeleteHash);
      clearShelbyCleanupRequired(media);
      return "deleted" as const;
    } catch (error) {
      if (isShelbyBlobNotFoundError(error)) {
        setFeedback({ type: "info", message: "Shelby content was already removed. Continuing with Palate delete." });
        clearShelbyCleanupRequired(media);
        return "confirmed_missing" as const;
      }

      markShelbyCleanupRequired(media);
      throw error;
    }
  }

  async function deleteMedia(mediaId: number) {
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      setFeedback({ type: "error", message: "Connect wallet to delete media." });
      return;
    }

    const media = mediaRecords.find((record) =>
      record.id === mediaId
        && record.source === "palate"
        && (record.storageStatus ?? "uploaded") !== "deleted"
        && (record.storageStatus === "shelby_upload_failed" || record.status === "idle")
        && record.palateMediaId !== null
        && record.palateMediaId !== undefined
    );

    if (!media) {
      setFeedback({ type: "error", message: "Choose an idle or failed media item to delete." });
      return;
    }

    setProcessingAction(`deleteMedia:${mediaId}`);
    setFeedback(null);

    try {
      const shelbyDeleteResult = await submitShelbyDelete(media);
      if (shelbyDeleteResult === "cleanup_required") {
        return;
      }

      let palateDeleteHash: string;
      try {
        palateDeleteHash = await submitPalateDelete(media);
      } catch (error) {
        console.error("Palate delete failed after Shelby delete", error);
        markDeletePending(media);
        setFeedback({ type: "error", message: `${getPalateDeleteErrorMessage(error)} Content was removed from Shelby, but on-chain delete did not complete.` });
        return;
      }

      await refreshUserMediaForWallet(walletAddress);
      setDeletePendingRecords((records) => records.filter((record) => record.mediaId !== (media.palateMediaId ?? media.id) || record.ownerAddress.toLowerCase() !== media.ownerAddress.toLowerCase()));
      setShelbyCleanupRequiredIds((ids) => ids.filter((id) => id !== (media.palateMediaId ?? media.id)));
      setFeedback({ type: "success", message: `Media deleted ${shortenTransactionHash(palateDeleteHash)}.` });
    } catch (error) {
      console.error("deleteMedia failed", error);
      setFeedback({ type: "error", message: getReadablePalateError(error, "Shelby delete failed. Retry Delete from My Media.") });
    } finally {
      setProcessingAction(null);
    }
  }

  async function retryOnChainDelete(mediaId: number) {
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      setFeedback({ type: "error", message: "Connect wallet to retry on-chain delete." });
      return;
    }

    const media = mediaRecords.find((record) =>
      record.id === mediaId
        && record.source === "palate"
        && record.palateMediaId !== null
        && record.palateMediaId !== undefined
        && isDeletePendingMedia(record)
    );

    if (!media) {
      setFeedback({ type: "error", message: "Choose a Delete pending media item." });
      return;
    }

    setProcessingAction(`retryDelete:${mediaId}`);
    setFeedback(null);

    try {
      const transactionHash = await submitPalateDelete(media);
      await refreshUserMediaForWallet(walletAddress);
      setDeletePendingRecords((records) => records.filter((record) => record.mediaId !== (media.palateMediaId ?? media.id) || record.ownerAddress.toLowerCase() !== media.ownerAddress.toLowerCase()));
      setFeedback({ type: "success", message: `On-chain delete confirmed ${shortenTransactionHash(transactionHash)}.` });
    } catch (error) {
      console.error("retryOnChainDelete failed", error);
      setFeedback({ type: "error", message: getPalateDeleteErrorMessage(error) });
    } finally {
      setProcessingAction(null);
    }
  }

  function markMediaContentUnavailable(mediaId: number) {
    setContentUnavailableIds((ids) => (ids.includes(mediaId) ? ids : [...ids, mediaId]));
  }

  async function createPushOnChain(mediaId: number, amount: string) {
    const finishPerf = startUiPerf("createPushOnChain", { mediaId, amount });
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      setFeedback({ type: "error", message: "Connect wallet to create a Push." });
      finishPerf("end", { skipped: true, reason: "wallet not connected" });
      return;
    }

    const media = mediaRecords.find((record) => record.id === mediaId);
    if (!media) {
      setFeedback({ type: "error", message: "Choose registered idle Palate media to create a Push." });
      finishPerf("end", { skipped: true, reason: "media not found" });
      return;
    }

    const eligibility = getPushEligibility(media);
    if (!eligibility.eligible) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Palate Push eligibility]", {
          mediaId: media.id,
          title: media.title,
          status: media.status,
          storageStatus: media.storageStatus ?? "uploaded",
          category: media.category,
          reason: eligibility.reason
        });
      }
      setFeedback({ type: "error", message: eligibility.reason });
      finishPerf("end", { skipped: true, reason: eligibility.reason });
      return;
    }

    try {
      const amountOctas = parseAptToOctas(amount);
      const minPushAmount = getRequiredConfigAmount("minPushAmount");
      if (BigInt(amountOctas) < minPushAmount) {
        setFeedback({ type: "error", message: `Minimum push is ${formatOctasToApt(minPushAmount)}.` });
        finishPerf("end", { skipped: true, reason: "amount below minimum" });
        return;
      }

      setProcessingAction("createPush");
      setFeedback(null);

      const data = buildCreatePushPayload(media.palateMediaId ?? media.id, amountOctas);
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Create Push submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshWalletGameState(walletAddress);
      setFeedback({ type: "success", message: `Push created ${shortenTransactionHash(transactionHash)}.` });
      finishPerf("success", { transactionHash, refreshedGameState: true });
    } catch (error) {
      console.error("createPush failed", error);
      setFeedback({ type: "error", message: getReadablePalateError(error, "Create Push failed.") });
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
    } finally {
      setProcessingAction(null);
    }
  }

  async function challengePushOnChain(pushId: number, challengerMediaId: number, amount: string) {
    const finishPerf = startUiPerf("challengePushOnChain", { pushId, challengerMediaId, amount });
    if (walletConnectionStatus !== "connected" || !walletAddress) {
      setFeedback({ type: "error", message: "Connect wallet to challenge a Push." });
      finishPerf("end", { skipped: true, reason: "wallet not connected" });
      return;
    }

    const selectedPush = waitingPushes.find((push) => push.id === pushId && push.status === "open");
    const challengerMedia = mediaRecords.find((record) => record.id === challengerMediaId);

    if (!selectedPush || !challengerMedia) {
      setFeedback({ type: "error", message: "Select an open waiting push and registered idle challenger media." });
      finishPerf("end", { skipped: true, reason: "push or challenger media missing" });
      return;
    }

    if (normalizeAddress(selectedPush.pusherAddress) === normalizeAddress(walletAddress)) {
      setFeedback({ type: "error", message: "You cannot challenge your own push." });
      finishPerf("end", { skipped: true, reason: "self challenge blocked" });
      return;
    }

    const pushEligibility = getPushEligibility(selectedPush.media, { requireIdle: false });
    if (!pushEligibility.eligible) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Palate Push eligibility]", {
          mediaId: selectedPush.media.id,
          title: selectedPush.media.title,
          status: selectedPush.media.status,
          storageStatus: selectedPush.media.storageStatus ?? "uploaded",
          category: selectedPush.media.category,
          reason: pushEligibility.reason
        });
      }
      setFeedback({ type: "error", message: pushEligibility.reason });
      finishPerf("end", { skipped: true, reason: pushEligibility.reason });
      return;
    }

    const challengerEligibility = getPushEligibility(challengerMedia);
    if (!challengerEligibility.eligible) {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Palate Push eligibility]", {
          mediaId: challengerMedia.id,
          title: challengerMedia.title,
          status: challengerMedia.status,
          storageStatus: challengerMedia.storageStatus ?? "uploaded",
          category: challengerMedia.category,
          reason: challengerEligibility.reason
        });
      }
      setFeedback({ type: "error", message: challengerEligibility.reason });
      finishPerf("end", { skipped: true, reason: challengerEligibility.reason });
      return;
    }

    if (challengerMedia.category !== selectedPush.media.category) {
      setFeedback({ type: "error", message: "Challenge rejected: media categories must match." });
      finishPerf("end", { skipped: true, reason: "category mismatch" });
      return;
    }

    try {
      const amountOctas = parseAptToOctas(amount);
      const minPushAmount = getRequiredConfigAmount("minPushAmount");
      const requiredChallengeAmount = getMinimumChallengeAmountOctas(selectedPush);
      const requiredAmount = requiredChallengeAmount > minPushAmount ? requiredChallengeAmount : minPushAmount;
      if (BigInt(amountOctas) < requiredAmount) {
        setFeedback({ type: "error", message: `Minimum challenge is ${formatOctasToApt(requiredAmount)}.` });
        finishPerf("end", { skipped: true, reason: "amount below minimum" });
        return;
      }

      setProcessingAction("challengePush");
      setFeedback(null);

      const data = buildChallengePushPayload(pushId, challengerMedia.palateMediaId ?? challengerMedia.id, amountOctas);
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Challenge submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshWalletGameState(walletAddress);
      setFeedback({ type: "success", message: `Challenge accepted ${shortenTransactionHash(transactionHash)}.` });
      finishPerf("success", { transactionHash, refreshedGameState: true });
    } catch (error) {
      console.error("challengePush failed", error);
      setFeedback({ type: "error", message: getReadablePalateError(error, "Challenge Push failed.") });
      finishPerf("error", { message: error instanceof Error ? error.message : String(error) });
    } finally {
      setProcessingAction(null);
    }
  }

  const visibleMediaRecords = useMemo(() => [
    ...pendingRegistrationMedia.filter((media) => !walletAddress || media.ownerAddress.toLowerCase() === walletAddress.toLowerCase()),
    ...mediaRecords
  ].map((media) => applyLocalMediaState(media)), [applyLocalMediaState, mediaRecords, pendingRegistrationMedia, walletAddress]);
  const visibleWaitingPushes = useMemo(() => waitingPushes.map((push) => ({
    ...push,
    media: applyLocalMediaState(push.media)
  })), [applyLocalMediaState, waitingPushes]);
  const visibleActiveMatches = useMemo(() => activeMatches.map((match) => ({
    ...match,
    mediaA: applyLocalMediaState(match.mediaA),
    mediaB: applyLocalMediaState(match.mediaB)
  })), [activeMatches, applyLocalMediaState]);
  const previewMediaRecords = useMemo(() => mock_media.map((media) => applyLocalMediaState(media)), [applyLocalMediaState]);
  const previewWaitingPushes = useMemo(() => mock_waiting_pushes.map((push) => ({
    ...push,
    media: applyLocalMediaState(push.media)
  })), [applyLocalMediaState]);
  const previewActiveMatches = useMemo(() => mock_matches.map((match) => ({
    ...match,
    mediaA: applyLocalMediaState(match.mediaA),
    mediaB: applyLocalMediaState(match.mediaB)
  })), [applyLocalMediaState]);
  const resolvedBalance = useMemo(() => (disconnectedPreviewMode ? mock_balance : balance), [balance, disconnectedPreviewMode]);
  const resolvedMediaRecords = useMemo(() => (disconnectedPreviewMode ? previewMediaRecords : visibleMediaRecords), [disconnectedPreviewMode, previewMediaRecords, visibleMediaRecords]);
  const resolvedWaitingPushes = useMemo(() => (disconnectedPreviewMode ? previewWaitingPushes : visibleWaitingPushes), [disconnectedPreviewMode, previewWaitingPushes, visibleWaitingPushes]);
  const resolvedActiveMatches = useMemo(() => (disconnectedPreviewMode ? previewActiveMatches : visibleActiveMatches), [disconnectedPreviewMode, previewActiveMatches, visibleActiveMatches]);
  const resolvedClaimRecords = claimRecords;
  const resolvedUserSummary = useMemo(() => (disconnectedPreviewMode ? mock_summary : userSummary), [disconnectedPreviewMode, userSummary]);
  const claimableRewardsSummary = useMemo(() => getClaimableRewardsSummary(resolvedClaimRecords), [resolvedClaimRecords]);
  const refreshClaims = useCallback(async () => {
    if (!walletAddress) return;
    await refreshClaimsForWallet(walletAddress);
  }, [refreshClaimsForWallet, walletAddress]);
  const refreshProfileActivity = useCallback(async () => {
    if (!walletAddress) return;
    await refreshProfileActivityForWallet(walletAddress);
  }, [refreshProfileActivityForWallet, walletAddress]);

  useEffect(() => {
    assertNoMockDataInConnectedMode({
      connected: connectedWalletReady,
      balance,
      mediaRecords: visibleMediaRecords,
      waitingPushes: visibleWaitingPushes,
      activeMatches: visibleActiveMatches,
      claimRecords,
      userSummary
    });
  }, [activeMatches, balance, claimRecords, connectedWalletReady, mediaRecords, userSummary, visibleActiveMatches, visibleMediaRecords, visibleWaitingPushes, waitingPushes]);

  const value: PalateContextValue = {
      walletStatus,
      setWalletStatus,
      mockWalletAddress,
      balance: resolvedBalance,
      mediaRecords: resolvedMediaRecords,
      waitingPushes: resolvedWaitingPushes,
      activeMatches: resolvedActiveMatches,
      currentAssignment,
      completedBuffSide,
      noValidMatchAvailable,
      claimRecords: resolvedClaimRecords,
      activityTransactions,
      userSummary: resolvedUserSummary,
      uploadStep,
      uploadRecovery,
      mediaReadStatus,
      claimReadStatus,
      palateBalanceReadStatus,
      userSummaryReadStatus,
      activityReadStatus,
      claimableRewardsSummary,
      processingAction,
      feedback,
      chainRead,
      clearFeedback: () => setFeedback(null),
      refreshClaims,
      refreshProfileActivity,
      connectMockWallet: () => {
        setWalletStatus("connecting");
        window.setTimeout(() => {
          setWalletStatus("connected");
          setFeedback({ type: "success", message: "Wallet connected." });
        }, 420);
      },
      disconnectMockWallet: () => {
        setWalletStatus("disconnected");
        setFeedback({ type: "info", message: "Wallet disconnected." });
      },
      simulateWrongNetwork: () => {
        setWalletStatus("wrong_network");
        setFeedback({ type: "error", message: "Wallet is on the wrong network. Use Aptos Testnet later." });
      },
      simulateWalletError: () => {
        setWalletStatus("error");
        setFeedback({ type: "error", message: "Wallet error state." });
      },
      depositBalance: async (amount) => runBalanceTransaction("deposit", amount),
      withdrawBalance: async (amount) => runBalanceTransaction("withdraw", amount),
      findMatch: findMatchOnChain,
      placeBuff: placeBuffOnChain,
      placeMockBuff: placeBuffOnChain,
      skipMatch: skipMatchOnChain,
      settleMatch: settleMatchOnChain,
      uploadMedia: registerMediaOnChain,
      retryPalateRegistration,
      deleteMedia,
      retryOnChainDelete,
      markMediaContentUnavailable,
      clearPendingRegistration,
      resetUploadFlow,
      uploadMockMedia: async (input) => {
        if (!VIDEO_ENABLED && input.category === "video") {
          setFeedback({ type: "error", message: "Video uploads are temporarily disabled for MVP." });
          return;
        }
        setProcessingAction("upload");
        setFeedback(null);
        for (const step of ["preparing_file", "uploading_to_shelby", "registering_on_chain", "completed"] as UploadStep[]) {
          setUploadStep(step);
          await delay(330);
        }
        const nextMedia: MediaRecord = {
          id: Math.max(...mediaRecords.map((media) => media.id)) + 1,
          ownerAddress: mockWalletAddress,
          title: getMediaDisplayTitle({
            title: input.title,
            originalFileName: input.fileName || input.file?.name || "",
            shelbyBlobRef: "",
            displayUrl: ""
          }),
          category: input.category,
          format: input.format,
          status: "idle",
          storageStatus: "uploaded",
          createdTime: "Just now",
          shelbyBlobRef: `mock://shelby/${Date.now()}.${input.format.toLowerCase()}`,
          contentHash: `mock_hash_${Date.now()}`,
          mimeType: input.mimeType || getMimeType(input.format),
          accent: getAccentForCategory(input.category)
        };
        setMediaRecords((records) => [nextMedia, ...records]);
        setFeedback({ type: "success", message: "Upload completed and media was added to My Media." });
        setProcessingAction(null);
      },
      createPush: createPushOnChain,
      challengePush: challengePushOnChain,
      createMockPush: async (mediaId, amount) => {
        await runMockAction("createPush", () => {
          const media = mediaRecords.find((record) => record.id === mediaId);
          const pushAmount = parseApt(amount);
          if (!media || media.status !== "idle") {
            setFeedback({ type: "error", message: "Choose an idle media item to create a push." });
            return;
          }
          if (!VIDEO_ENABLED && media.category === "video") {
            setFeedback({ type: "error", message: "Video media is disabled for MVP." });
            return;
          }
          if (pushAmount < 1) {
            setFeedback({ type: "error", message: "Push rejected: minimum push is 1.000 APT." });
            return;
          }
          if (pushAmount > getAvailableBalanceNumber()) {
            setFeedback({ type: "error", message: "Push rejected: insufficient Palate Balance." });
            return;
          }
          subtractAvailableBalance(pushAmount);
          setMediaRecords((records) => records.map((record) => (record.id === mediaId ? { ...record, status: "waiting" } : record)));
          setWaitingPushes((pushes) => [
            {
              id: Date.now(),
              media: { ...media, status: "waiting" },
              pusherAddress: mockWalletAddress,
              pushAmount: formatApt(pushAmount),
              minChallengeAmount: getMinChallengeAmount(formatApt(pushAmount)),
              createdTime: "Just now",
              status: "open"
            },
            ...pushes
          ]);
          setFeedback({ type: "success", message: "Push created. It is now waiting for a challenger." });
        });
      },
      challengeMockPush: async (pushId, challengerMediaId, amount) => {
        await runMockAction("challengePush", () => {
          const push = waitingPushes.find((candidate) => candidate.id === pushId && candidate.status === "open");
          const challenger = mediaRecords.find((media) => media.id === challengerMediaId);
          const challengeAmount = parseApt(amount);
          if (!push || !challenger) {
            setFeedback({ type: "error", message: "Select a waiting push and challenger media." });
            return;
          }
          if (challenger.status !== "idle") {
            setFeedback({ type: "error", message: "Challenge rejected: challenger media must be idle." });
            return;
          }
          if (!VIDEO_ENABLED && (challenger.category === "video" || push.media.category === "video")) {
            setFeedback({ type: "error", message: "Video media is disabled for MVP." });
            return;
          }
          if (challenger.category !== push.media.category) {
            setFeedback({ type: "error", message: "Challenge rejected: media categories must match." });
            return;
          }
          if (challengeAmount < parseApt(push.minChallengeAmount)) {
            setFeedback({ type: "error", message: `Challenge rejected: minimum is ${push.minChallengeAmount}.` });
            return;
          }
          if (challengeAmount > getAvailableBalanceNumber()) {
            setFeedback({ type: "error", message: "Challenge rejected: insufficient Palate Balance." });
            return;
          }
          subtractAvailableBalance(challengeAmount);
          const mediaA = { ...push.media, status: "active" as const };
          const mediaB = { ...challenger, status: "active" as const };
          setMediaRecords((records) =>
            records.map((record) => {
              if (record.id === mediaA.id) return mediaA;
              if (record.id === mediaB.id) return mediaB;
              return record;
            })
          );
          setWaitingPushes((pushes) => pushes.map((candidate) => (candidate.id === pushId ? { ...candidate, status: "challenged" } : candidate)));
          setActiveMatches((matches) => [
            {
              id: Date.now(),
              mediaA,
              mediaB,
              pusherA: push.pusherAddress,
              pusherB: mockWalletAddress,
              pushAmountA: push.pushAmount,
              pushAmountB: formatApt(challengeAmount),
              category: push.media.category,
              timeRemaining: "23:59:59",
              endTimeSeconds: String(Math.floor(Date.now() / 1000) + 86399),
              status: "active"
            },
            ...matches
          ]);
          setFeedback({ type: "success", message: "Challenge accepted. A live match was created." });
        });
      },
      claimReward: claimRewardOnChain,
      claimMockReward: claimRewardOnChain
    };

  return <PalateContext.Provider value={value}>{children}</PalateContext.Provider>;
}

export function usePalate() {
  const context = useContext(PalateContext);

  if (!context) {
    throw new Error("usePalate must be used inside PalateProvider");
  }

  return context;
}
