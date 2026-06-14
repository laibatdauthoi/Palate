export type MediaCategory = "meme" | "image" | "audio" | "video";
export type MediaFormat = "PNG" | "JPG" | "JPEG" | "WEBP" | "GIF" | "MP3" | "WAV" | "OGG" | "M4A" | "MP4" | "WEBM" | "MOV";
export type MediaStatus = "idle" | "waiting" | "active" | "settled" | "disabled" | "banned" | "pending_registration" | "registration_failed";
export type MatchStatus = "active" | "settled";
export type ClaimType = "push" | "buff";
export type MediaSource = "palate_contract" | "palate_upload_recovery";
export type UploadStep =
  | "idle"
  | "preparing_file"
  | "generating_commitments"
  | "registering_shelby_blob"
  | "uploading_to_shelby"
  | "shelby_upload_failed"
  | "shelby_uploaded"
  | "registering_palate_media"
  | "completed"
  | "failed";
export type WalletStatus = "disconnected" | "connecting" | "connected" | "wrong_network" | "error";
export type BuffSide = "A" | "B";
export type ChainReadStatus = "idle" | "loading" | "ready" | "error";

export type ChainCategoryConstants = {
  meme: number;
  image: number;
  audio: number;
  video: number;
};

export type ChainProtocolConfig = {
  protocolFeeBps: string;
  minPushAmount: string;
  minBuffAmount: string;
  minPushIncrementBps: string;
  matchDurationSeconds: string;
  buffCommitmentAmount: string;
  skipPenaltyAmount: string;
  randomRetryCount: string;
  scoreAlgorithmType: number;
  scoreScale: string;
  scoreLogBase: string;
  treasuryAddress: string;
  adminAddress: string;
};

export type ChainReadState = {
  status: ChainReadStatus;
  networkLabel: string;
  moduleAddress: string;
  moduleName: string;
  categories: ChainCategoryConstants | null;
  treasuryAddress: string | null;
  protocolConfig: ChainProtocolConfig | null;
  error: string | null;
};

export type MediaRecord = {
  id: number;
  palateMediaId?: number | null;
  source?: MediaSource;
  ownerAddress: string;
  title: string;
  category: MediaCategory;
  format: MediaFormat;
  status: MediaStatus;
  createdTime: string;
  shelbyBlobRef: string;
  contentHash: string;
  mimeType: string;
  originalFileName?: string;
  fileSize?: number;
  shelbyRegistrationHash?: string | null;
  registrationError?: string | null;
  registrationRetryCount?: number;
  createdTimeSeconds?: string;
  accent: "pink" | "purple" | "rose" | "deep";
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
  claimed: boolean;
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
