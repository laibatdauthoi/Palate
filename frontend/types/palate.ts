export type MediaCategory = "meme" | "image";
export type MediaFormat = "PNG" | "JPG" | "JPEG" | "WEBP" | "GIF";
export type MediaStatus = "idle" | "waiting" | "active" | "settled" | "disabled" | "banned";
export type MatchStatus = "active" | "settled";
export type ClaimType = "push" | "buff";
export type UploadStep = "preparing_file" | "uploading_to_shelby" | "registering_on_chain" | "completed" | "failed";
export type WalletStatus = "disconnected" | "connecting" | "connected" | "wrong_network" | "error";
export type BuffSide = "A" | "B";

export type MediaRecord = {
  id: number;
  ownerAddress: string;
  title: string;
  category: MediaCategory;
  format: MediaFormat;
  status: MediaStatus;
  createdTime: string;
  shelbyBlobRef: string;
  contentHash: string;
  mimeType: string;
  accent: "pink" | "purple";
};

export type WaitingPush = {
  id: number;
  media: MediaRecord;
  pusherAddress: string;
  pushAmount: string;
  minChallengeAmount: string;
  createdTime: string;
  status: "open" | "cancelled" | "challenged";
};

export type ActiveMatch = {
  id: number;
  mediaA: MediaRecord;
  mediaB: MediaRecord;
  pusherA: string;
  pusherB: string;
  pushAmountA: string;
  pushAmountB: string;
  category: MediaCategory;
  timeRemaining: string;
  status: MatchStatus;
};

export type BuffAssignment = {
  match: ActiveMatch;
  assignedAt: string;
  commitmentAmount: string;
  skipPenaltyAmount: string;
};

export type PalateBalance = {
  availableBalance: string;
  totalDeposited: string;
  totalWithdrawn: string;
  lockedPushAmount: string;
  lockedBuffAmount: string;
  lockedCommitmentAmount: string;
  totalClaimed: string;
};

export type ClaimRecord = {
  id: number;
  type: ClaimType;
  matchRef: string;
  amount: string;
  settledTime: string;
  claimable: boolean;
};

export type UserSummary = {
  walletAddress: string;
  claimableAmount: string;
  pushProfit: string;
  buffProfit: string;
  totalPushed: string;
  totalBuffed: string;
  pushWinRate: string;
  buffWinRate: string;
  pushCount: string;
  pushWins: string;
  pushLosses: string;
  buffCount: string;
  buffWins: string;
  buffLosses: string;
  pendingBuffs: string;
  skipPenalty: string;
};
