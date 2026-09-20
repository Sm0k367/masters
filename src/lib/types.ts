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

export type DiligenceCheck = {
  id: string;
  label: string;
  status: "pass" | "fail" | "warn" | "info" | "pending";
  detail: string;
};

export type DiligenceReport = {
  pair: ScoredPair | null;
  query: string;
  chain: ChainKey;
  clones: PairSnapshot[];
  checks: DiligenceCheck[];
  goplus: Record<string, string | number | boolean | null> | null;
  holders: { address: string; percent: number; locked: boolean; tag: string }[];
  top10Percent: number | null;
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
