import { isQuoteSymbol } from "@/lib/chains";
import type { PairSnapshot, TokenClass } from "@/lib/types";

export const KNOWN_CORE: Record<
  string,
  { class: TokenClass; note: string }
> = {
  "0x39dbed3a2bd333467115de45665cc57f813c4571": {
    class: "infra",
    note: "PONS — Robinhood Chain launchpad. Fee revenue, buybacks, closest thing to infrastructure.",
  },
  "0x020bfc650a365f8bb26819deaabf3e21291018b4": {
    class: "blue_chip_meme",
    note: "CASHCAT — original breakout meme on the chain. More liquid than yesterday’s 16-hour ticker.",
  },
  "0x2e8c31162b855a2ffa90f6f8634643ad6f111e18": {
    class: "ai_meme",
    note: "Artificial Inu (AI) — sticky AI meme that keeps showing up in volume, not a 2-hour launch.",
  },
};

export const TOKENIZED_TICKERS = new Set([
  "NVDA",
  "SPY",
  "SPCX",
  "META",
  "TSLA",
  "AAPL",
  "GOOGL",
  "GOOG",
  "AMZN",
  "MSFT",
  "QQQ",
  "HOOD",
  "PLTR",
  "COIN",
  "MSTR",
  "AMD",
  "NFLX",
  "BABA",
  "IBIT",
  "CRCL",
  "INTC",
  "TSM",
  "AVGO",
  "ORCL",
]);

const CAT_WORDS = [
  "cat",
  "kitten",
  "meow",
  "whisker",
  "hood cat",
  "cashcat",
  "neko",
];
const AI_WORDS = ["ai", "gpt", "agent", "inu", "neural", "llm", "robot"];
const STABLE_WORDS = ["usdg", "usdc", "usdt", "usd1", "dai"];

function hay(pair: PairSnapshot): string {
  return `${pair.base.symbol} ${pair.base.name}`.toLowerCase();
}

export function classifyPair(pair: PairSnapshot): TokenClass {
  const address = pair.base.address.toLowerCase();
  const known = KNOWN_CORE[address];
  if (known) return known.class;

  const symbol = pair.base.symbol.toUpperCase();
  if (isQuoteSymbol(symbol) || STABLE_WORDS.includes(symbol.toLowerCase())) {
    return "stable";
  }
  if (["BTC", "ETH", "SOL", "WETH", "WBTC"].includes(symbol)) {
    return "major";
  }
  if (TOKENIZED_TICKERS.has(symbol) || symbol.endsWith("X") && TOKENIZED_TICKERS.has(symbol.slice(0, -1))) {
    return "tokenized_stock";
  }
  if (TOKENIZED_TICKERS.has(symbol.replace(/ON$/, ""))) {
    return "tokenized_stock";
  }

  const text = hay(pair);
  const ageHours = pair.ageMs != null ? pair.ageMs / 3_600_000 : null;
  if (ageHours != null && ageHours < 48 && pair.liquidityUsd < 400_000) {
    if (CAT_WORDS.some((word) => text.includes(word))) return "cat_meme";
    if (AI_WORDS.some((word) => text.split(/[^a-z0-9]+/).includes(word) || text.includes("artificial"))) {
      return "ai_meme";
    }
    return "launch";
  }
  if (CAT_WORDS.some((word) => text.includes(word))) return "cat_meme";
  if (text.includes("artificial") || /\bai\b/.test(text)) return "ai_meme";
  if (pair.liquidityUsd < 30_000) {
    if (pair.volume.h24 >= 100_000) return "mid_tier";
    return "dust";
  }
  if (pair.liquidityUsd >= 250_000 && (ageHours == null || ageHours >= 48)) {
    return "mid_tier";
  }
  if (ageHours != null && ageHours < 48) return "launch";
  return "mid_tier";
}

export function classLabel(tokenClass: TokenClass): string {
  switch (tokenClass) {
    case "infra":
      return "Infrastructure";
    case "blue_chip_meme":
      return "Blue-chip meme";
    case "tokenized_stock":
      return "Tokenized stock";
    case "ai_meme":
      return "AI meme";
    case "cat_meme":
      return "Cat meme";
    case "launch":
      return "Launch";
    case "mid_tier":
      return "Mid-tier";
    case "dust":
      return "Dust";
    case "stable":
      return "Stable / gas";
    case "major":
      return "Major";
    default: {
      const _exhaustive: never = tokenClass;
      return _exhaustive;
    }
  }
}

export function classHint(tokenClass: TokenClass): string {
  switch (tokenClass) {
    case "infra":
      return "Closest thing to an infrastructure token. Still volatile.";
    case "blue_chip_meme":
      return "Sticky meme with a real holder base. Less explosive, more liquid.";
    case "tokenized_stock":
      return "On-chain exposure, not actual stock ownership. Tracks crypto liquidity too.";
    case "ai_meme":
      return "AI narrative cycle. Treat as a meme unless liquidity is deep.";
    case "cat_meme":
      return "Cat meta is constant on this chain. Most clones die.";
    case "launch":
      return "Launch-effect lottery ticket. Average outcome is zero.";
    case "mid_tier":
      return "Shows up in volume, still not a core holding.";
    case "dust":
      return "Book is too thin. Your buy is the chart.";
    case "stable":
      return "Dry powder / gas. Not a trade.";
    case "major":
      return "Majors. Different risk profile than a 16-hour ticker.";
    default: {
      const _exhaustive: never = tokenClass;
      return _exhaustive;
    }
  }
}
