import { preferredQuote } from "@/lib/chains";
import { classifyPair } from "@/lib/classify";
import { ageMinutes } from "@/lib/format";
import type { PairSnapshot, RiskFlag, ScoredPair, TokenClass, Verdict } from "@/lib/types";

const DUST_LIQ = 30_000;
const THIN_LIQ = 50_000;
const SIZE_LIQ = 100_000;

function buyPressure(pair: PairSnapshot): number | null {
  const { buys, sells } = pair.txns.h1;
  const total = buys + sells;
  if (total < 4) return null;
  return buys / total;
}

function uniqueMakers(pair: PairSnapshot): number | null {
  const buyers = pair.txns.h1.buyers;
  const sellers = pair.txns.h1.sellers;
  if (buyers == null && sellers == null) return null;
  return (buyers ?? 0) + (sellers ?? 0);
}

function impactForSize(liquidityUsd: number, sizeUsd: number): number | null {
  if (liquidityUsd <= 0) return null;
  return (sizeUsd / (2 * liquidityUsd)) * 100;
}

function scoreClass(tokenClass: TokenClass): number {
  switch (tokenClass) {
    case "infra":
      return 28;
    case "tokenized_stock":
      return 24;
    case "blue_chip_meme":
      return 18;
    case "mid_tier":
      return 10;
    case "ai_meme":
      return 6;
    case "cat_meme":
      return 4;
    case "major":
      return 20;
    case "stable":
      return 0;
    case "launch":
      return -6;
    case "dust":
      return -30;
    default: {
      const _exhaustive: never = tokenClass;
      return _exhaustive;
    }
  }
}

export function scorePair(pair: PairSnapshot): ScoredPair {
  const tokenClass = classifyPair(pair);
  const flags: RiskFlag[] = [];
  const reasons: string[] = [];
  let score = 50 + scoreClass(tokenClass);

  const minutes = ageMinutes(pair.ageMs);
  const pressure = buyPressure(pair);
  const makers = uniqueMakers(pair);
  const impact1k = impactForSize(pair.liquidityUsd, 1000);

  if (pair.boosted) {
    flags.push("paid_trend", "boosted");
    reasons.push("Paid DexScreener/GMGN boost — trending ≠ organic.");
    score -= 8;
  }

  if (pair.liquidityUsd <= 0 && pair.volume.h24 >= SIZE_LIQ) {
    flags.push("warning");
    reasons.push(
      "Venue did not report a pool reserve. Volume is not an exit — size as if the book is unknown.",
    );
    score -= 6;
  } else if (pair.liquidityUsd < DUST_LIQ) {
    flags.push("thin_book");
    reasons.push(`Liquidity ${Math.round(pair.liquidityUsd)} is dust. Skip unless you accept a total loss.`);
    score -= 25;
  } else if (pair.liquidityUsd < THIN_LIQ) {
    flags.push("thin_book");
    reasons.push("Liquidity under $50k. Big % prints are not exits.");
    score -= 12;
  } else if (pair.liquidityUsd >= SIZE_LIQ) {
    reasons.push("Book is thick enough that a small ticket is not the whole chart.");
    score += 8;
  }

  if (minutes != null && minutes < 5) {
    flags.push("warning");
    reasons.push("Pool is under 5 minutes old. Pure snipe, not a market.");
    score -= 10;
  } else if (minutes != null && minutes < 180) {
    reasons.push("Sub-3h pool. Launch-effect is doing the work.");
    score -= 4;
  } else if (minutes != null && minutes < 48 * 60) {
    reasons.push("Under 48 hours. Still a lottery ticket even if it looks real.");
  } else if (minutes != null) {
    score += 6;
    reasons.push("Survived more than two days — rarer than a ticker that just printed.");
  }

  if (!preferredQuote(pair.quote.symbol, pair.chain)) {
    flags.push("warning");
    reasons.push(`Quote is ${pair.quote.symbol}, not a preferred quote on ${pair.chainLabel}. Extra hop risk.`);
    score -= 4;
  }

  if (pressure != null) {
    if (pressure >= 0.62) {
      reasons.push(`H1 tape is buy-heavy (${Math.round(pressure * 100)}% buys).`);
      score += 6;
    } else if (pressure <= 0.38) {
      flags.push("warning");
      reasons.push("Sellers already own the last hour. Chase is late.");
      score -= 10;
    }
  }

  const h24 = pair.change.h24 ?? 0;
  if (h24 >= 500) {
    flags.push("suspicious");
    reasons.push(`${Math.round(h24)}% in 24h. That print is usually already done.`);
    score -= 8;
  }
  if (h24 <= -70 && (minutes == null || minutes < 24 * 60)) {
    flags.push("spam");
    reasons.push("Already dumped more than 70% from the launch spike.");
    score -= 12;
  }

  if (makers != null && makers < 8 && pair.volume.h1 > 20_000) {
    flags.push("suspicious");
    reasons.push("Volume with almost no unique wallets — likely looped.");
    score -= 14;
  } else if (makers != null && makers >= 80) {
    score += 5;
    reasons.push("Lots of unique makers in the last hour.");
  }

  if (impact1k != null && impact1k > 8) {
    flags.push("thin_book");
    reasons.push(`A $1k clip is ~${impact1k.toFixed(1)}% of the book.`);
    score -= 8;
  }

  if (tokenClass === "tokenized_stock") {
    reasons.push("Tokenized stocks are not share ownership. Different risk than a Hood/Cat clone, still crypto.");
  }
  if (tokenClass === "infra") {
    reasons.push("Infrastructure bid — still size it like a volatile crypto token.");
  }
  if (tokenClass === "launch" || tokenClass === "cat_meme" || tokenClass === "ai_meme") {
    if (minutes != null && minutes < 48 * 60) {
      flags.push("warning");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let verdict: Verdict;
  if (tokenClass === "stable" || tokenClass === "major") {
    verdict = tokenClass === "major" ? "core" : "watch";
  } else if (flags.includes("honeypot") || pair.liquidityUsd < DUST_LIQ || flags.includes("spam")) {
    verdict = "skip";
  } else if (tokenClass === "infra" || tokenClass === "tokenized_stock") {
    verdict = pair.liquidityUsd >= SIZE_LIQ ? "core" : "watch";
  } else if (tokenClass === "blue_chip_meme" && pair.liquidityUsd >= SIZE_LIQ) {
    verdict = "size";
  } else if (
    (tokenClass === "launch" || tokenClass === "cat_meme" || tokenClass === "ai_meme") &&
    (minutes == null || minutes < 48 * 60)
  ) {
    verdict = score >= 55 ? "lottery" : "skip";
  } else if (score >= 70 && pair.liquidityUsd >= SIZE_LIQ) {
    verdict = "size";
  } else if (score >= 52) {
    verdict = "watch";
  } else {
    verdict = "skip";
  }

  if (flags.length === 0) flags.push("clean");

  return {
    ...pair,
    tokenClass,
    verdict,
    score,
    flags: Array.from(new Set(flags)),
    reasons,
    buyPressureH1: pressure,
    uniqueMakersH1: makers,
    impactFor1k: impact1k,
  };
}

export function scoreMany(pairs: PairSnapshot[]): ScoredPair[] {
  const seen = new Set<string>();
  const scored: ScoredPair[] = [];
  for (const pair of pairs) {
    const key = `${pair.chain}:${pair.base.address.toLowerCase()}`;
    if (!pair.base.address) {
      const fallback = `${pair.chain}:${pair.base.symbol}:${pair.pairAddress}`;
      if (seen.has(fallback)) continue;
      seen.add(fallback);
      scored.push(scorePair(pair));
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    scored.push(scorePair(pair));
  }
  return scored;
}

export function applyBoosts(pairs: PairSnapshot[], boosted: Set<string>): PairSnapshot[] {
  return pairs.map((pair) => {
    const key = `${pair.chain === "eth" ? "ethereum" : pair.chain}:${pair.base.address.toLowerCase()}`;
    if (boosted.has(key) || boosted.has(`${pair.chain}:${pair.base.address.toLowerCase()}`)) {
      return { ...pair, boosted: true };
    }
    return pair;
  });
}

export function verdictLabel(verdict: Verdict): string {
  switch (verdict) {
    case "skip":
      return "Skip";
    case "lottery":
      return "Lottery";
    case "watch":
      return "Watch";
    case "size":
      return "Size-small";
    case "core":
      return "Core tape";
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}

export function filterScan(
  pairs: ScoredPair[],
  opts: {
    minLiq?: number;
    maxAgeHours?: number | null;
    minAgeMinutes?: number | null;
    hideBoosted?: boolean;
    preferredQuoteOnly?: boolean;
  },
): ScoredPair[] {
  return pairs.filter((pair) => {
    if (opts.minLiq != null) {
      const reported = pair.liquidityUsd >= opts.minLiq;
      const volumeProxy = pair.liquidityUsd <= 0 && pair.volume.h24 >= opts.minLiq;
      if (!reported && !volumeProxy) return false;
    }
    if (opts.hideBoosted && pair.boosted) return false;
    if (opts.preferredQuoteOnly && !preferredQuote(pair.quote.symbol, pair.chain)) return false;
    const hours = pair.ageMs != null ? pair.ageMs / 3_600_000 : null;
    const minutes = pair.ageMs != null ? pair.ageMs / 60_000 : null;
    if (opts.maxAgeHours != null && hours != null && hours > opts.maxAgeHours) return false;
    if (opts.minAgeMinutes != null && minutes != null && minutes < opts.minAgeMinutes) {
      return false;
    }
    return true;
  });
}

export function flashTake(pairs: ScoredPair[]): string {
  const launches = pairs.filter((pair) => pair.verdict === "lottery").slice(0, 4);
  const cores = pairs
    .filter((pair) => pair.verdict === "core" || pair.tokenClass === "infra")
    .slice(0, 3);
  const skip = pairs.filter((pair) => pair.verdict === "skip").slice(0, 3);
  const launchBit =
    launches.length > 0
      ? `Hottest % names (${launches.map((pair) => pair.base.symbol).join(", ")}) are launch-effect pumps. Lottery tickets.`
      : "No fresh lottery tape worth naming.";
  const coreBit =
    cores.length > 0
      ? `Stickier tape: ${cores.map((pair) => pair.base.symbol).join(", ")}.`
      : "";
  const skipBit =
    skip.length > 0
      ? `Automatic passes: ${skip.map((pair) => pair.base.symbol).join(", ")}.`
      : "";
  return [
    launchBit,
    coreBit,
    skipBit,
    "Not financial advice — average new token on this chain goes to zero.",
  ]
    .filter(Boolean)
    .join(" ");
}
