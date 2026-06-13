export type MediaStatus = "Idle" | "Waiting" | "Active" | "Settled";
export type MediaCategory = "Meme" | "Image";
export type MediaFormat = "PNG" | "JPG" | "JPEG" | "WEBP" | "GIF";

export type MockMedia = {
  id: number;
  title: string;
  category: MediaCategory;
  format: MediaFormat;
  status: MediaStatus;
  created: string;
  accent: string;
};

export type MockWaitingPush = {
  id: number;
  media: MockMedia;
  pusher: string;
  pushAmount: string;
  minChallengeAmount: string;
  created: string;
};

export type MockMatch = {
  id: number;
  mediaA: MockMedia;
  mediaB: MockMedia;
  category: MediaCategory;
  timeRemaining: string;
  status: "Active" | "Settled";
};

export type MockClaim = {
  id: number;
  type: "Push" | "Buff";
  matchRef: string;
  amount: string;
  settledTime: string;
  claimable: boolean;
};

// Temporary mock data for Task F1 visual scaffolding only.
// Replace with Aptos contract reads and Shelby media sources during integration.
export const mock_media: MockMedia[] = [
  {
    id: 1,
    title: "Midnight Signal",
    category: "Meme",
    format: "GIF",
    status: "Idle",
    created: "Today",
    accent: "pink"
  },
  {
    id: 2,
    title: "Chrome Shrine",
    category: "Image",
    format: "WEBP",
    status: "Waiting",
    created: "Yesterday",
    accent: "purple"
  },
  {
    id: 3,
    title: "Noir Reaction",
    category: "Meme",
    format: "PNG",
    status: "Active",
    created: "2 days ago",
    accent: "pink"
  },
  {
    id: 4,
    title: "Glass Arena",
    category: "Image",
    format: "JPG",
    status: "Settled",
    created: "Last week",
    accent: "purple"
  },
  {
    id: 5,
    title: "Velvet Glitch",
    category: "Image",
    format: "JPEG",
    status: "Idle",
    created: "Last week",
    accent: "pink"
  },
  {
    id: 6,
    title: "Quiet Flex",
    category: "Meme",
    format: "WEBP",
    status: "Idle",
    created: "Last month",
    accent: "purple"
  }
];

export const mock_waiting_pushes: MockWaitingPush[] = [
  {
    id: 101,
    media: mock_media[1],
    pusher: "0x92c4...18af",
    pushAmount: "10.00 APT",
    minChallengeAmount: "10.50 APT",
    created: "18 min ago"
  },
  {
    id: 102,
    media: mock_media[0],
    pusher: "0x71dd...90aa",
    pushAmount: "6.20 APT",
    minChallengeAmount: "6.51 APT",
    created: "42 min ago"
  }
];

export const mock_matches: MockMatch[] = [
  {
    id: 501,
    mediaA: mock_media[2],
    mediaB: mock_media[5],
    category: "Meme",
    timeRemaining: "07:42:18",
    status: "Active"
  },
  {
    id: 502,
    mediaA: mock_media[4],
    mediaB: mock_media[3],
    category: "Image",
    timeRemaining: "12:08:44",
    status: "Active"
  }
];

export const mock_claims: MockClaim[] = [
  {
    id: 9001,
    type: "Push",
    matchRef: "Match 448",
    amount: "19.975 APT",
    settledTime: "2h ago",
    claimable: true
  },
  {
    id: 9002,
    type: "Buff",
    matchRef: "Match 451",
    amount: "3.420 APT",
    settledTime: "Yesterday",
    claimable: true
  },
  {
    id: 9003,
    type: "Buff",
    matchRef: "Match 466",
    amount: "Pending",
    settledTime: "Awaiting settlement",
    claimable: false
  }
];

export const mock_stats = {
  wallet: "0x91f8...2b40",
  availableBalance: "84.250 APT",
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
