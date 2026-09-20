import { fetchMajors } from "@/lib/coingecko";
import { getDailyBrief } from "@/lib/markets";
import type {
  DailyBrief,
  LiveAction,
  LiveFill,
  LiveIntent,
  LivePosition,
  LiveSymbol,
  LiveTick,
  LiveVenue,
  MajorQuote,
} from "@/lib/types";

export const LIVE_CLIP_USD = 10;
export const LIVE_MAX_OPEN = 1;
export const LIVE_STOP_PCT = -8;
export const LIVE_MAX_DAILY = 30;
export const LIVE_COOLDOWN_MS = 20 * 60 * 1000;
export const LIVE_ACCOUNT_MASKED = "••••5205";

const CRYPTO: LiveSymbol[] = ["BTC", "ETH", "SOL"];
const EQUITY: LiveSymbol[] = ["SPY", "NVDA"];

function venueOf(symbol: LiveSymbol): LiveVenue {
  switch (symbol) {
    case "BTC":
    case "ETH":
    case "SOL":
      return "crypto";
    case "SPY":
    case "NVDA":
      return "equity";
    default: {
      const _exhaustive: never = symbol;
      return _exhaustive;
    }
  }
}

function cashSessionOpen(now = new Date()): boolean {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return false;
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return minutes >= 13 * 60 + 30 && minutes < 20 * 60;
}

function todayStamp(iso: string): string {
  return iso.slice(0, 10);
}

function dailySpent(fills: LiveFill[], nowIso: string): number {
  const day = todayStamp(nowIso);
  return fills
    .filter(
      (fill) =>
        todayStamp(fill.at) === day &&
        fill.side === "buy" &&
        (fill.status === "filled" || fill.status === "submitted"),
    )
    .reduce((sum, fill) => sum + fill.notionalUsd, 0);
}

function lastFillAt(fills: LiveFill[]): number | null {
  let latest: number | null = null;
  for (const fill of fills) {
    if (fill.status === "rejected" || fill.status === "preview") continue;
    const ts = Date.parse(fill.at);
    if (!Number.isFinite(ts)) continue;
    if (latest == null || ts > latest) latest = ts;
  }
  return latest;
}

function stickyHas(brief: DailyBrief, symbol: LiveSymbol): boolean {
  return brief.stickier.some((pair) => pair.base.symbol.toUpperCase() === symbol);
}

function majorOf(majors: MajorQuote[], symbol: LiveSymbol): MajorQuote | null {
  return majors.find((row) => row.symbol === symbol) ?? null;
}

function pickCrypto(majors: MajorQuote[]): LiveSymbol {
  const ranked = CRYPTO.map((symbol) => {
    const row = majorOf(majors, symbol);
    return { symbol, change: row?.change24h ?? 0, price: row?.price ?? 0 };
  }).sort((a, b) => b.change - a.change);
  const best = ranked[0];
  if (best && best.change >= 0.4) return best.symbol;
  return "ETH";
}

function pickEquity(brief: DailyBrief): LiveSymbol | null {
  if (stickyHas(brief, "SPY")) return "SPY";
  if (stickyHas(brief, "NVDA")) return "NVDA";
  return null;
}

function intent(
  action: LiveAction,
  symbol: LiveSymbol | null,
  headline: string,
  body: string,
  notionalUsd = 0,
): LiveIntent {
  return {
    action,
    symbol,
    venue: symbol ? venueOf(symbol) : null,
    notionalUsd,
    headline,
    body,
  };
}

export function decideLiveTick(input: {
  brief: DailyBrief;
  majors: MajorQuote[];
  positions: LivePosition[];
  fills: LiveFill[];
  armed: boolean;
  buyingPower: number;
  cryptoBuyingPower: number;
  now?: Date;
}): LiveIntent {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();

  if (!input.armed) {
    return intent(
      "skip",
      null,
      "Kill switch is on.",
      "No new clips. Open positions are left alone until you arm the desk again.",
    );
  }

  const open = input.positions.filter((pos) => pos.quantity > 0);
  if (open.length > 0) {
    const pos = open[0];
    if (pos.pnlPct <= LIVE_STOP_PCT) {
      return intent(
        "sell",
        pos.symbol,
        `Stop: ${pos.symbol} is ${pos.pnlPct.toFixed(1)}% vs cost.`,
        `Desk rule is cut at ${LIVE_STOP_PCT}% — not a Pons-style hold-to-zero. This is a sell of the live clip, not a trench token.`,
        Math.min(pos.valueUsd, LIVE_CLIP_USD * 2),
      );
    }
    return intent(
      "hold",
      pos.symbol,
      `Holding ${pos.symbol}. One clip at a time.`,
      `Mark ${pos.mark.toFixed(pos.venue === "crypto" ? 2 : 2)} · ${pos.pnlPct.toFixed(1)}% vs cost. No add. Lottery names stay off this account.`,
    );
  }

  const spent = dailySpent(input.fills, nowIso);
  if (spent >= LIVE_MAX_DAILY) {
    return intent(
      "skip",
      null,
      "Daily notional cap hit.",
      `Already ${spent.toFixed(0)} USD in buys today. Cap is $${LIVE_MAX_DAILY}.`,
    );
  }

  const last = lastFillAt(input.fills);
  if (last != null && now.getTime() - last < LIVE_COOLDOWN_MS) {
    const wait = Math.ceil((LIVE_COOLDOWN_MS - (now.getTime() - last)) / 60_000);
    return intent(
      "skip",
      null,
      "Cooldown.",
      `Last live clip was too recent. ${wait}m left before the next one.`,
    );
  }

  const session = cashSessionOpen(now);
  const equityPick = session ? pickEquity(input.brief) : null;
  const symbol: LiveSymbol = equityPick ?? pickCrypto(input.majors);
  const venue = venueOf(symbol);
  const quote = majorOf(input.majors, symbol);
  const change = quote?.change24h ?? 0;

  if (change <= -5) {
    return intent(
      "skip",
      symbol,
      `${symbol} is ${change.toFixed(1)}% on the day — no knife catch.`,
      "Automated clips only go into names that are not already dumping. Trench launches are never mapped onto this account.",
    );
  }

  const power = venue === "crypto" ? input.cryptoBuyingPower : input.buyingPower;
  const notional = Math.min(LIVE_CLIP_USD, Math.floor(power * 100) / 100);
  if (power < 5 || notional < 5) {
    return intent(
      "skip",
      symbol,
      "Not enough buying power for a clip.",
      `Need at least $5. Crypto buying power is ${power.toFixed(2)}.`,
    );
  }

  const why =
    venue === "equity"
      ? `${symbol} is on the stickier tape (tokenized names on chain 4663 are not this stock). Cash session is open. Clip $${notional.toFixed(0)}.`
      : `${symbol} is the 24/7 live book. Uniswap size maps to ETH; Solana heat maps to SOL; otherwise BTC. Never PONS/CASHCAT. Clip $${notional.toFixed(0)}.`;

  return intent(
    "buy",
    symbol,
    `Buy $${notional.toFixed(0)} ${symbol} on Robinhood.`,
    why,
    notional,
  );
}

export async function runLiveTick(book: {
  armed: boolean;
  cash: number;
  buyingPower: number;
  cryptoBuyingPower: number;
  positions: LivePosition[];
  fills: LiveFill[];
  lastTickAt: string | null;
  lastFillAt: string | null;
}): Promise<LiveTick> {
  const [brief, majors] = await Promise.all([getDailyBrief(), fetchMajors()]);
  const intentNow = decideLiveTick({
    brief,
    majors,
    positions: book.positions,
    fills: book.fills,
    armed: book.armed,
    buyingPower: book.buyingPower,
    cryptoBuyingPower: book.cryptoBuyingPower,
  });

  const notes = [
    "Live clips are Robinhood brokerage BTC/ETH/SOL (and SPY/NVDA in the cash session).",
    "Tokenized NVDA/SPY on Robinhood Chain are not share ownership and are not this order path.",
    "Pons launches, CASHCAT, and sub-48h lottery names are never auto-bought.",
    "Not financial advice. A $10 clip can still go to zero.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    book: {
      armed: book.armed,
      accountMasked: LIVE_ACCOUNT_MASKED,
      cash: book.cash,
      buyingPower: book.buyingPower,
      cryptoBuyingPower: book.cryptoBuyingPower,
      positions: book.positions,
      dailyNotional: dailySpent(book.fills, new Date().toISOString()),
      lastTickAt: new Date().toISOString(),
      lastFillAt: book.lastFillAt,
    },
    intent: intentNow,
    fills: book.fills.slice(0, 40),
    config: {
      clipUsd: LIVE_CLIP_USD,
      maxOpen: LIVE_MAX_OPEN,
      stopPct: LIVE_STOP_PCT,
      maxDailyNotional: LIVE_MAX_DAILY,
      cooldownMs: LIVE_COOLDOWN_MS,
    },
    notes,
  };
}
