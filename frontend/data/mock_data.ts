import type { ActiveMatch, ClaimRecord, MediaRecord, PalateBalance, UserSummary, WaitingPush } from "@/types/palate";

const mock_owner = "0x91f8...2b40";

// Disconnected preview data only.
// Do not use this data as fallback in connected wallet mode.
// Connected mode must render only real chain/local user state, loading states, or unavailable states.
export const mock_media: MediaRecord[] = [
  {
    id: 1,
    ownerAddress: mock_owner,
    title: "Midnight Signal",
    category: "meme",
    format: "GIF",
    status: "idle",
    createdTime: "Today",
    shelbyBlobRef: "mock://shelby/midnight-signal.gif",
    contentHash: "mock_hash_midnight_signal",
    mimeType: "image/gif",
    accent: "pink"
  },
  {
    id: 2,
    ownerAddress: mock_owner,
    title: "Chrome Shrine",
    category: "image",
    format: "WEBP",
    status: "waiting",
    createdTime: "Yesterday",
    shelbyBlobRef: "mock://shelby/chrome-shrine.webp",
    contentHash: "mock_hash_chrome_shrine",
    mimeType: "image/webp",
    accent: "purple"
  },
  {
    id: 3,
    ownerAddress: mock_owner,
    title: "Noir Reaction",
    category: "meme",
    format: "PNG",
    status: "active",
    createdTime: "2 days ago",
    shelbyBlobRef: "mock://shelby/noir-reaction.png",
    contentHash: "mock_hash_noir_reaction",
    mimeType: "image/png",
    accent: "pink"
  },
  {
    id: 4,
    ownerAddress: mock_owner,
    title: "Glass Arena",
    category: "image",
    format: "JPG",
    status: "settled",
    createdTime: "Last week",
    shelbyBlobRef: "mock://shelby/glass-arena.jpg",
    contentHash: "mock_hash_glass_arena",
    mimeType: "image/jpeg",
    accent: "purple"
  },
  {
    id: 5,
    ownerAddress: mock_owner,
    title: "Velvet Glitch",
    category: "image",
    format: "JPEG",
    status: "idle",
    createdTime: "Last week",
    shelbyBlobRef: "mock://shelby/velvet-glitch.jpeg",
    contentHash: "mock_hash_velvet_glitch",
    mimeType: "image/jpeg",
    accent: "rose"
  },
  {
    id: 6,
    ownerAddress: mock_owner,
    title: "Quiet Flex",
    category: "meme",
    format: "WEBP",
    status: "idle",
    createdTime: "Last month",
    shelbyBlobRef: "mock://shelby/quiet-flex.webp",
    contentHash: "mock_hash_quiet_flex",
    mimeType: "image/webp",
    accent: "purple"
  },
  {
    id: 7,
    ownerAddress: mock_owner,
    title: "Bass Cathedral",
    category: "audio",
    format: "MP3",
    status: "idle",
    createdTime: "Today",
    shelbyBlobRef: "mock://shelby/bass-cathedral.mp3",
    contentHash: "mock_hash_bass_cathedral",
    mimeType: "audio/mpeg",
    accent: "deep"
  },
  {
    id: 8,
    ownerAddress: mock_owner,
    title: "Afterimage Cut",
    category: "video",
    format: "MP4",
    status: "idle",
    createdTime: "Yesterday",
    shelbyBlobRef: "mock://shelby/afterimage-cut.mp4",
    contentHash: "mock_hash_afterimage_cut",
    mimeType: "video/mp4",
    accent: "pink"
  },
  {
    id: 9,
    ownerAddress: mock_owner,
    title: "Velour Loop",
    category: "audio",
    format: "OGG",
    status: "waiting",
    createdTime: "3 days ago",
    shelbyBlobRef: "mock://shelby/velour-loop.ogg",
    contentHash: "mock_hash_velour_loop",
    mimeType: "audio/ogg",
    accent: "rose"
  }
];

export const mock_waiting_pushes: WaitingPush[] = [
  {
    id: 101,
    media: mock_media[1],
    pusherAddress: "0x92c4...18af",
    pushAmount: "10.00 APT",
    minChallengeAmount: "10.50 APT",
    createdTime: "18 min ago",
    status: "open"
  },
  {
    id: 102,
    media: mock_media[0],
    pusherAddress: "0x71dd...90aa",
    pushAmount: "6.20 APT",
    minChallengeAmount: "6.51 APT",
    createdTime: "42 min ago",
    status: "open"
  },
  {
    id: 103,
    media: mock_media[8],
    pusherAddress: "0x33fa...69ce",
    pushAmount: "4.00 APT",
    minChallengeAmount: "4.20 APT",
    createdTime: "9 min ago",
    status: "open"
  }
];

export const mock_matches: ActiveMatch[] = [
  {
    id: 501,
    mediaA: mock_media[2],
    mediaB: mock_media[5],
    pusherA: "0x85fa...3001",
    pusherB: "0xbd55...4170",
    pushAmountA: "8.00 APT",
    pushAmountB: "8.40 APT",
    category: "meme",
    timeRemaining: "07:42:18",
    endTimeSeconds: String(Math.floor(Date.now() / 1000) + (7 * 3600) + (42 * 60) + 18),
    status: "active"
  },
  {
    id: 502,
    mediaA: mock_media[4],
    mediaB: mock_media[3],
    pusherA: "0x55a1...84de",
    pusherB: "0x03fb...9ef1",
    pushAmountA: "12.00 APT",
    pushAmountB: "12.60 APT",
    category: "image",
    timeRemaining: "12:08:44",
    endTimeSeconds: String(Math.floor(Date.now() / 1000) + (12 * 3600) + (8 * 60) + 44),
    status: "active"
  }
];

export const mock_claims: ClaimRecord[] = [
  {
    id: 9001,
    type: "push",
    matchRef: "Match 448",
    amount: "19.975 APT",
    settledTime: "2h ago",
    claimable: true,
    claimed: false
  },
  {
    id: 9002,
    type: "buff",
    matchRef: "Match 451",
    amount: "3.420 APT",
    settledTime: "Yesterday",
    claimable: true,
    claimed: false
  },
  {
    id: 9003,
    type: "buff",
    matchRef: "Match 466",
    amount: "Pending",
    settledTime: "Awaiting settlement",
    claimable: false,
    claimed: false
  }
];

export const mock_balance: PalateBalance = {
  availableBalance: "84.250 APT",
  totalDeposited: "120.000 APT",
  totalWithdrawn: "18.000 APT",
  lockedPushAmount: "14.500 APT",
  lockedBuffAmount: "2.750 APT",
  lockedCommitmentAmount: "0.500 APT",
  totalClaimed: "23.395 APT"
};

export const mock_summary: UserSummary = {
  walletAddress: mock_owner,
  claimableAmount: "23.395 APT",
  pushProfit: "+12.810 APT",
  buffProfit: "+4.620 APT",
  totalPushed: "48.000 APT",
  totalBuffed: "16.900 APT",
  pushWinRate: "62%",
  buffWinRate: "58%",
  pushCount: "13",
  pushWins: "8",
  pushLosses: "5",
  buffCount: "31",
  buffWins: "18",
  buffLosses: "13",
  pendingBuffs: "4",
  skipPenalty: "0.500 APT"
};
