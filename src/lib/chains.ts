import type { ChainKey } from "@/lib/types";

export type ChainConfig = {
  key: ChainKey;
  label: string;
  gecko: string;
  dex: string;
  eip155: number | null;
  goplus: number | string | null;
  native: string;
  quotes: string[];
  explorerToken: (address: string) => string;
  dexScreener: string;
  gmgn: string;
  birdeye: string;
  geckoBoard: string;
  uniswap?: string;
  color: string;
};

export const CHAINS: Record<ChainKey, ChainConfig> = {
  robinhood: {
    key: "robinhood",
    label: "Robinhood",
    gecko: "robinhood",
    dex: "robinhood",
    eip155: 4663,
    goplus: 4663,
    native: "ETH",
    quotes: ["WETH", "ETH", "USDG", "USDC"],
    explorerToken: (address) =>
      `https://robinhoodchain.blockscout.com/token/${address}`,
    dexScreener: "https://dexscreener.com/robinhood",
    gmgn: "https://gmgn.ai/robinhood",
    birdeye: "https://birdeye.so/robinhood",
    geckoBoard: "https://www.geckoterminal.com/robinhood/pools",
    uniswap: "https://app.uniswap.org/explore?chain=robinhood",
    color: "#00c805",
  },
  solana: {
    key: "solana",
    label: "Solana",
    gecko: "solana",
    dex: "solana",
    eip155: null,
    goplus: "solana",
    native: "SOL",
    quotes: ["SOL", "WSOL", "USDC", "USDT"],
    explorerToken: (address) => `https://solscan.io/token/${address}`,
    dexScreener: "https://dexscreener.com/solana",
    gmgn: "https://gmgn.ai/sol",
    birdeye: "https://birdeye.so/?chain=solana",
    geckoBoard: "https://www.geckoterminal.com/solana/pools",
    color: "#9945ff",
  },
  base: {
    key: "base",
    label: "Base",
    gecko: "base",
    dex: "base",
    eip155: 8453,
    goplus: 8453,
    native: "ETH",
    quotes: ["WETH", "ETH", "USDC", "USDG"],
    explorerToken: (address) => `https://basescan.org/token/${address}`,
    dexScreener: "https://dexscreener.com/base",
    gmgn: "https://gmgn.ai/base",
    birdeye: "https://birdeye.so/?chain=base",
    geckoBoard: "https://www.geckoterminal.com/base/pools",
    uniswap: "https://app.uniswap.org/explore?chain=base",
    color: "#0052ff",
  },
  eth: {
    key: "eth",
    label: "Ethereum",
    gecko: "eth",
    dex: "ethereum",
    eip155: 1,
    goplus: 1,
    native: "ETH",
    quotes: ["WETH", "ETH", "USDC", "USDT"],
    explorerToken: (address) => `https://etherscan.io/token/${address}`,
    dexScreener: "https://dexscreener.com/ethereum",
    gmgn: "https://gmgn.ai/eth",
    birdeye: "https://birdeye.so/?chain=ethereum",
    geckoBoard: "https://www.geckoterminal.com/eth/pools",
    uniswap: "https://app.uniswap.org/explore?chain=ethereum",
    color: "#627eea",
  },
  bsc: {
    key: "bsc",
    label: "BNB Chain",
    gecko: "bsc",
    dex: "bsc",
    eip155: 56,
    goplus: 56,
    native: "BNB",
    quotes: ["WBNB", "BNB", "USDT", "USDC"],
    explorerToken: (address) => `https://bscscan.com/token/${address}`,
    dexScreener: "https://dexscreener.com/bsc",
    gmgn: "https://gmgn.ai/bsc",
    birdeye: "https://birdeye.so/?chain=bsc",
    geckoBoard: "https://www.geckoterminal.com/bsc/pools",
    color: "#f0b90b",
  },
  arbitrum: {
    key: "arbitrum",
    label: "Arbitrum",
    gecko: "arbitrum",
    dex: "arbitrum",
    eip155: 42161,
    goplus: 42161,
    native: "ETH",
    quotes: ["WETH", "ETH", "USDC", "USDT"],
    explorerToken: (address) => `https://arbiscan.io/token/${address}`,
    dexScreener: "https://dexscreener.com/arbitrum",
    gmgn: "https://gmgn.ai/arb",
    birdeye: "https://birdeye.so/?chain=arbitrum",
    geckoBoard: "https://www.geckoterminal.com/arbitrum/pools",
    uniswap: "https://app.uniswap.org/explore?chain=arbitrum",
    color: "#12aafe",
  },
  hyperliquid: {
    key: "hyperliquid",
    label: "Hyperliquid",
    gecko: "hyperliquid",
    dex: "hyperevm",
    eip155: 999,
    goplus: null,
    native: "HYPE",
    quotes: ["HYPE", "WHYPE", "USDC", "USDT0"],
    explorerToken: (address) => `https://hyperevmscan.io/token/${address}`,
    dexScreener: "https://dexscreener.com/hyperevm",
    gmgn: "https://gmgn.ai/hyperliquid",
    birdeye: "https://birdeye.so/?chain=hyperliquid",
    geckoBoard: "https://www.geckoterminal.com/hyperliquid/pools",
    color: "#97fce4",
  },
  plasma: {
    key: "plasma",
    label: "Plasma",
    gecko: "plasma",
    dex: "plasma",
    eip155: null,
    goplus: null,
    native: "XPL",
    quotes: ["USDT0", "USDT", "WETH"],
    explorerToken: (address) => `https://plasmascan.to/token/${address}`,
    dexScreener: "https://dexscreener.com/plasma",
    gmgn: "https://gmgn.ai",
    birdeye: "https://birdeye.so",
    geckoBoard: "https://www.geckoterminal.com/plasma/pools",
    color: "#6ee7b7",
  },
  monad: {
    key: "monad",
    label: "Monad",
    gecko: "monad",
    dex: "monad",
    eip155: 143,
    goplus: null,
    native: "MON",
    quotes: ["WMON", "MON", "USDC"],
    explorerToken: (address) => `https://monadvision.com/token/${address}`,
    dexScreener: "https://dexscreener.com/monad",
    gmgn: "https://gmgn.ai",
    birdeye: "https://birdeye.so",
    geckoBoard: "https://www.geckoterminal.com/monad/pools",
    color: "#836ef9",
  },
  sui: {
    key: "sui",
    label: "Sui",
    gecko: "sui-network",
    dex: "sui",
    eip155: null,
    goplus: null,
    native: "SUI",
    quotes: ["SUI", "USDC", "USDT"],
    explorerToken: (address) => `https://suiscan.xyz/mainnet/coin/${address}`,
    dexScreener: "https://dexscreener.com/sui",
    gmgn: "https://gmgn.ai",
    birdeye: "https://birdeye.so/?chain=sui",
    geckoBoard: "https://www.geckoterminal.com/sui-network/pools",
    color: "#4da2ff",
  },
  ton: {
    key: "ton",
    label: "TON",
    gecko: "ton",
    dex: "ton",
    eip155: null,
    goplus: null,
    native: "TON",
    quotes: ["TON", "USDT"],
    explorerToken: (address) => `https://tonviewer.com/${address}`,
    dexScreener: "https://dexscreener.com/ton",
    gmgn: "https://gmgn.ai",
    birdeye: "https://birdeye.so",
    geckoBoard: "https://www.geckoterminal.com/ton/pools",
    color: "#0098ea",
  },
};

export const CHAIN_ORDER: ChainKey[] = [
  "robinhood",
  "solana",
  "base",
  "eth",
  "bsc",
  "arbitrum",
  "hyperliquid",
  "plasma",
  "monad",
  "sui",
  "ton",
];

export const PRIMARY_SCAN_CHAINS: ChainKey[] = [
  "robinhood",
  "solana",
  "base",
  "eth",
  "bsc",
  "arbitrum",
  "hyperliquid",
];

const GECKO_TO_KEY = new Map(
  Object.values(CHAINS).map((chain) => [chain.gecko, chain.key] as const),
);
const DEX_TO_KEY = new Map(
  Object.values(CHAINS).map((chain) => [chain.dex, chain.key] as const),
);

export function chainFromGecko(id: string): ChainKey | null {
  return GECKO_TO_KEY.get(id) ?? null;
}

export function chainFromDex(id: string): ChainKey | null {
  if (id === "ethereum") return "eth";
  return DEX_TO_KEY.get(id) ?? null;
}

export function isQuoteSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return [
    "WETH",
    "ETH",
    "USDG",
    "USDC",
    "USDT",
    "USD1",
    "SOL",
    "WSOL",
    "WBNB",
    "BNB",
    "HYPE",
    "WHYPE",
    "USDT0",
    "SUI",
    "TON",
    "WMON",
    "MON",
    "XPL",
    "WBTC",
    "BTC",
  ].includes(upper);
}

export function preferredQuote(symbol: string): boolean {
  return ["WETH", "ETH", "USDG", "USDC", "SOL", "WSOL"].includes(
    symbol.toUpperCase(),
  );
}
