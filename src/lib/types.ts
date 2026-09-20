export type Verdict = "skip" | "lottery" | "watch" | "size" | "core";

export type TokenClass =
  | "infra"
  | "blue_chip_meme"
  | "tokenized_stock"
  | "ai_meme"
  | "cat_meme"
  | "launch"
  | "mid_tier"
  | "dust"
  | "stable"
  | "major";

export type RiskFlag =
  | "clean"
  | "warning"
  | "suspicious"
  | "spam"
  | "boosted"
  | "honeypot"
  | "tax"
  | "mint"
  | "blacklist"
  | "concentrated"
  | "thin_book"
  | "clone"
  | "paid_trend";

export type AgentId =
  | "scout"
  | "tape"
  | "depth"
  | "risk"
  | "narrative"
  | "chief";

export type ChainKey =
  | "robinhood"
  | "solana"
  | "base"
  | "eth"
  | "bsc"
  | "arbitrum"
  | "hyperliquid"
  | "plasma"
  | "monad"
  | "sui"
  | "ton";

export type TxnWindow = {
  buys: number;
  sells: number;
  buyers?: number;
  sellers?: number;
};

export type PairSnapshot = {
  id: string;
  chain: ChainKey;
  chainLabel: string;
  dex: string;
  dexLabel: string;
  pairAddress: string;
  url: string;
  base: {
    address: string;
    name: string;
    symbol: string;
  };
  quote: {
    address: string;
    name: string;
    symbol: string;
  };
  priceUsd: number | null;
  priceNative: number | null;
  change: {
    m5: number | null;
    m15: number | null;
    m30: number | null;
    h1: number | null;
    h6: number | null;
    h24: number | null;
  };
  volume: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  txns: {
    m5: TxnWindow;
    h1: TxnWindow;
    h6: TxnWindow;
    h24: TxnWindow;
  };
  liquidityUsd: number;
  fdvUsd: number | null;
  marketCapUsd: number | null;
  createdAt: string | null;
  ageMs: number | null;
  imageUrl: string | null;
  boosted: boolean;
  labels: string[];
};

export type ScoredPair = PairSnapshot & {
  tokenClass: TokenClass;
  verdict: Verdict;
  score: number;
  flags: RiskFlag[];
  reasons: string[];
  buyPressureH1: number | null;
  uniqueMakersH1: number | null;
  impactFor1k: number | null;
};

export type AgentNote = {
  id: AgentId;
  name: string;
  headline: string;
  body: string;
  stance: Verdict;
  confidence: number;
};

export type DeskReport = {
  pair: ScoredPair;
  agents: AgentNote[];
  chief: AgentNote;
  briefing: string;
  llmUsed: boolean;
  llmModel: string | null;
  generatedAt: string;
};

export type CheckStatus = "pass" | "fail" | "warn" | "info" | "pending";

export type CheckCategory =
  | "contract"
  | "honeypot"
  | "liquidity"
  | "holders"
  | "tape"
  | "clones"
  | "solana";

export type DiligenceCheck = {
  id: string;
  category: CheckCategory;
  label: string;
  status: CheckStatus;
  detail: string;
};

export type RugVerdict = "hard_no" | "caution" | "watch" | "clearer";

export type RugMeter = {
  score: number;
  verdict: RugVerdict;
  headline: string;
  hardFails: number;
  warns: number;
};

export type KillSwitch = {
  id: string;
  label: string;
  status: CheckStatus;
};

export type DiligenceSource = {
  name: string;
  ok: boolean;
  note: string;
};

export type SimSnapshot = {
  source: string;
  isHoneypot: boolean | null;
  buyTax: number | null;
  sellTax: number | null;
  transferTax: number | null;
  buyGas: number | null;
  sellGas: number | null;
  risk: string | null;
  openSource: boolean | null;
  holderFailedPct: number | null;
  simulationSuccess: boolean | null;
  flags: string[];
};

export type LpSnapshot = {
  lockedPct: number | null;
  burnedPct: number | null;
  holderCount: number | null;
  unlockedTop: {
    address: string;
    percent: number;
    locked: boolean;
    tag: string;
    isContract: boolean;
  }[];
};

export type DiligenceReport = {
  pair: ScoredPair | null;
  query: string;
  chain: ChainKey;
  clones: PairSnapshot[];
  checks: DiligenceCheck[];
  meter: RugMeter;
  killSwitches: KillSwitch[];
  goplus: {
    mintable: boolean;
    freezeable: boolean;
    honeypot: boolean;
    blacklist: boolean;
    hiddenOwner: boolean;
    ownerRenounced: boolean;
    openSource: boolean | null;
    isProxy: boolean;
    buyTax: number | null;
    sellTax: number | null;
    creatorPercent: number | null;
    ownerPercent: number | null;
    holderCount: number | null;
  } | null;
  sim: SimSnapshot | null;
  solana: {
    rugged: boolean;
    riskScore: number | null;
    mintAuthority: boolean;
    freezeAuthority: boolean;
    mutableMetadata: boolean;
    risks: { name: string; level: string; description: string }[];
  } | null;
  holders: {
    address: string;
    percent: number;
    locked: boolean;
    tag: string;
    isContract: boolean;
  }[];
  lp: LpSnapshot | null;
  top10Percent: number | null;
  creatorPercent: number | null;
  ownerPercent: number | null;
  sources: DiligenceSource[];
  generatedAt: string;
};

export type HeatStat = {
  chain: ChainKey;
  label: string;
  volume24h: number;
  trades24h: number;
  newPools24h: number;
  topSymbol: string | null;
};

export type MajorQuote = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
};

export type DailyBrief = {
  generatedAt: string;
  heat: HeatStat[];
  majors: MajorQuote[];
  stickier: ScoredPair[];
  volumeLeaders: ScoredPair[];
  launches: ScoredPair[];
  movers: ScoredPair[];
  tokenized: ScoredPair[];
  otherChains: ScoredPair[];
  metas: { name: string; slug: string; volume: number; tokenCount: number; change24h: number }[];
  notes: string[];
  sources: string[];
};

export type ScanResponse = {
  chain: ChainKey;
  generatedAt: string;
  newPools: ScoredPair[];
  trending: ScoredPair[];
};

export type ChainBoard = {
  generatedAt: string;
  boards: {
    chain: ChainKey;
    label: string;
    trending: ScoredPair[];
    volume24h: number;
  }[];
};

export type LiveVenue = "crypto" | "equity";

export type LiveSymbol = "BTC" | "ETH" | "SOL" | "SPY" | "NVDA";

export type LiveAction = "buy" | "sell" | "hold" | "skip";

export type LiveFillStatus = "preview" | "submitted" | "filled" | "rejected";

export type LivePosition = {
  symbol: LiveSymbol;
  venue: LiveVenue;
  quantity: number;
  avgCost: number;
  mark: number;
  valueUsd: number;
  pnlPct: number;
};

export type LiveFill = {
  id: string;
  at: string;
  symbol: LiveSymbol;
  venue: LiveVenue;
  side: "buy" | "sell";
  notionalUsd: number;
  status: LiveFillStatus;
  brokerId: string | null;
  refId: string | null;
  reason: string;
};

export type LiveBook = {
  armed: boolean;
  accountMasked: string;
  cash: number;
  buyingPower: number;
  cryptoBuyingPower: number;
  positions: LivePosition[];
  dailyNotional: number;
  lastTickAt: string | null;
  lastFillAt: string | null;
};

export type LiveIntent = {
  action: LiveAction;
  symbol: LiveSymbol | null;
  venue: LiveVenue | null;
  notionalUsd: number;
  headline: string;
  body: string;
};

export type LiveTick = {
  generatedAt: string;
  book: LiveBook;
  intent: LiveIntent;
  fills: LiveFill[];
  config: {
    clipUsd: number;
    maxOpen: number;
    stopPct: number;
    maxDailyNotional: number;
    cooldownMs: number;
  };
  notes: string[];
};
