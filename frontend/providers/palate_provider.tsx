"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { mock_balance, mock_claims, mock_matches, mock_media, mock_summary, mock_waiting_pushes } from "@/data/mock_data";
import { app_config } from "@/config/app_config";
import {
  buildRegisterMediaPayload,
  buildDepositBalancePayload,
  buildWithdrawBalancePayload,
  getChainReadSnapshot,
  getPalateBalance,
  getUserMedia,
  parseAptToOctas,
  shortenTransactionHash,
  waitForPalateTransaction
} from "@/services/aptos_service";
import { usePalateWallet } from "@/providers/wallet_provider";
import type {
  ActiveMatch,
  BuffAssignment,
  BuffSide,
  ChainReadState,
  ClaimRecord,
  MediaCategory,
  MediaFormat,
  MediaRecord,
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
};

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
  mediaReadStatus: "idle" | "loading" | "ready" | "error";
  processingAction: string | null;
  feedback: Feedback;
  chainRead: ChainReadState;
  clearFeedback: () => void;
  connectMockWallet: () => void;
  disconnectMockWallet: () => void;
  simulateWrongNetwork: () => void;
  simulateWalletError: () => void;
  depositBalance: (amount: string) => Promise<void>;
  withdrawBalance: (amount: string) => Promise<void>;
  findMatch: () => Promise<void>;
  placeMockBuff: (side: BuffSide, amount: string) => Promise<void>;
  skipMatch: () => Promise<void>;
  uploadMedia: (input: UploadMediaInput) => Promise<void>;
  uploadMockMedia: (input: UploadMediaInput) => Promise<void>;
  createMockPush: (mediaId: number, amount: string) => Promise<void>;
  challengeMockPush: (pushId: number, challengerMediaId: number, amount: string) => Promise<void>;
  claimMockReward: (claimId: number) => Promise<void>;
};

const PalateContext = createContext<PalateContextValue | null>(null);
const mockWalletAddress = mock_summary.walletAddress;

const initial_chain_read_state: ChainReadState = {
  status: "idle",
  networkLabel: app_config.networkLabel,
  moduleAddress: app_config.moduleAddress,
  moduleName: app_config.moduleName,
  categories: null,
  treasuryAddress: null,
  protocolConfig: null,
  error: null
};

function parseApt(value: string) {
  const parsed = Number.parseFloat(value.replace("APT", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatApt(value: number) {
  return `${Math.max(0, value).toFixed(3)} APT`;
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

function getCategoryLabel(category: MediaCategory) {
  if (category === "meme") return "Meme";
  if (category === "image") return "Image";
  if (category === "audio") return "Audio";
  return "Video";
}

function getAccentForCategory(category: MediaCategory): MediaRecord["accent"] {
  if (category === "meme") return "pink";
  if (category === "image") return "rose";
  if (category === "audio") return "deep";
  return "purple";
}

export function PalateProvider({ children }: { children: ReactNode }) {
  const { signAndSubmitTransaction, walletAddress, walletStatus: walletConnectionStatus } = usePalateWallet();
  const [walletStatus, setWalletStatus] = useState<WalletStatus>("connected");
  const [balance, setBalance] = useState<PalateBalance>(mock_balance);
  const [mediaRecords, setMediaRecords] = useState<MediaRecord[]>(mock_media);
  const [waitingPushes, setWaitingPushes] = useState<WaitingPush[]>(mock_waiting_pushes);
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>(mock_matches);
  const [claimRecords, setClaimRecords] = useState<ClaimRecord[]>(mock_claims);
  const [userSummary] = useState<UserSummary>(mock_summary);
  const [currentAssignment, setCurrentAssignment] = useState<BuffAssignment | null>(null);
  const [completedBuffSide, setCompletedBuffSide] = useState<BuffSide | null>(null);
  const [noValidMatchAvailable, setNoValidMatchAvailable] = useState(false);
  const [usedMatchIds, setUsedMatchIds] = useState<number[]>([]);
  const [assignmentCursor, setAssignmentCursor] = useState(0);
  const [uploadStep, setUploadStep] = useState<UploadStep | null>(null);
  const [mediaReadStatus, setMediaReadStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [chainRead, setChainRead] = useState<ChainReadState>(initial_chain_read_state);

  useEffect(() => {
    let cancelled = false;

    async function loadChainReadState() {
      setChainRead((current) => ({ ...current, status: "loading", error: null }));

      try {
        const snapshot = await getChainReadSnapshot();

        if (cancelled) return;

        setChainRead((current) => ({
          ...current,
          status: "ready",
          categories: snapshot.categories,
          treasuryAddress: snapshot.treasuryAddress,
          protocolConfig: snapshot.protocolConfig,
          error: null
        }));
      } catch (error) {
        if (cancelled) return;

        setChainRead((current) => ({
          ...current,
          status: "error",
          error: error instanceof Error ? error.message : "Aptos read failed."
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

  function addAvailableBalance(amount: number) {
    updateAvailableBalance(getAvailableBalanceNumber() + amount);
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

  async function refreshPalateBalanceForWallet(ownerAddress: string) {
    const nextBalance = await getPalateBalance(ownerAddress);
    setBalance(nextBalance);
  }

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

  useEffect(() => {
    if (walletConnectionStatus !== "connected" || !walletAddress) return;

    let cancelled = false;
    const ownerAddress = walletAddress;

    async function refreshOnWalletConnect() {
      try {
        const [nextBalance, nextMedia] = await Promise.all([
          getPalateBalance(ownerAddress),
          getUserMedia(ownerAddress)
        ]);
        if (!cancelled) {
          setBalance(nextBalance);
          setMediaRecords(nextMedia);
          setMediaReadStatus("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setFeedback({ type: "error", message: error instanceof Error ? error.message : "Unable to load Palate Balance." });
          setMediaReadStatus("error");
        }
      }
    }

    refreshOnWalletConnect();

    return () => {
      cancelled = true;
    };
  }, [walletAddress, walletConnectionStatus]);

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
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Transaction failed." });
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

    setProcessingAction("upload");
    setFeedback(null);

    try {
      setUploadStep("preparing_file");
      await delay(330);
      setUploadStep("uploading_to_shelby");
      await delay(430);
      setUploadStep("registering_on_chain");

      const createdTime = Math.floor(Date.now() / 1000).toString();
      const safeTitle = input.title.trim() || `Palate ${getCategoryLabel(input.category)}`;
      const safeFileName = encodeURIComponent(input.fileName || `${safeTitle}.${input.format.toLowerCase()}`);
      const shelbyBlobRef = `pending-shelby://${walletAddress}/${createdTime}/${safeFileName}`;
      const contentHash = `pending-content-${createdTime}-${input.format.toLowerCase()}`;
      const data = buildRegisterMediaPayload({
        category: input.category,
        shelbyBlobRef,
        contentHash,
        mimeType: input.mimeType || getMimeType(input.format),
        title: safeTitle,
        createdTime,
        categoryConstants: chainRead.categories
      });
      const transactionHash = await signAndSubmitTransaction({ data });
      setFeedback({ type: "info", message: `Registration submitted ${shortenTransactionHash(transactionHash)}. Waiting for confirmation.` });
      await waitForPalateTransaction(transactionHash);
      await refreshUserMediaForWallet(walletAddress);
      setUploadStep("completed");
      setFeedback({ type: "success", message: `Media registered on chain ${shortenTransactionHash(transactionHash)}.` });
    } catch (error) {
      setUploadStep("failed");
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Media registration failed." });
    } finally {
      setProcessingAction(null);
    }
  }

  const value: PalateContextValue = {
      walletStatus,
      setWalletStatus,
      mockWalletAddress,
      balance,
      mediaRecords,
      waitingPushes,
      activeMatches,
      currentAssignment,
      completedBuffSide,
      noValidMatchAvailable,
      claimRecords,
      userSummary,
      uploadStep,
      mediaReadStatus,
      processingAction,
      feedback,
      chainRead,
      clearFeedback: () => setFeedback(null),
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
      findMatch: async () => {
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
      },
      placeMockBuff: async (side, amount) => {
        await runMockAction("placeBuff", () => {
          const buffAmount = parseApt(amount);
          if (!currentAssignment) {
            setFeedback({ type: "error", message: "Find Match before placing a Buff." });
            return;
          }
          if (buffAmount < 0.1) {
            setFeedback({ type: "error", message: "Buff rejected: minimum is 0.10 APT." });
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
      },
      skipMatch: async () => {
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
      },
      uploadMedia: registerMediaOnChain,
      uploadMockMedia: async (input) => {
        setProcessingAction("upload");
        setFeedback(null);
        for (const step of ["preparing_file", "uploading_to_shelby", "registering_on_chain", "completed"] as UploadStep[]) {
          setUploadStep(step);
          await delay(330);
        }
        const nextMedia: MediaRecord = {
          id: Math.max(...mediaRecords.map((media) => media.id)) + 1,
          ownerAddress: mockWalletAddress,
          title: input.title.trim() || `Palate ${getCategoryLabel(input.category)}`,
          category: input.category,
          format: input.format,
          status: "idle",
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
      createMockPush: async (mediaId, amount) => {
        await runMockAction("createPush", () => {
          const media = mediaRecords.find((record) => record.id === mediaId);
          const pushAmount = parseApt(amount);
          if (!media || media.status !== "idle") {
            setFeedback({ type: "error", message: "Choose an idle media item to create a push." });
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
              status: "active"
            },
            ...matches
          ]);
          setFeedback({ type: "success", message: "Challenge accepted. A live match was created." });
        });
      },
      claimMockReward: async (claimId) => {
        await runMockAction("claimReward", () => {
          const claim = claimRecords.find((candidate) => candidate.id === claimId);
          if (!claim || !claim.claimable || claim.claimed) {
            setFeedback({ type: "error", message: "Claim is not available." });
            return;
          }
          addAvailableBalance(parseApt(claim.amount));
          setClaimRecords((records) => records.map((record) => (record.id === claimId ? { ...record, claimable: false, claimed: true } : record)));
          setFeedback({ type: "success", message: `${claim.type === "buff" ? "Buff" : "Push"} reward credited to Palate Balance.` });
        });
      }
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
