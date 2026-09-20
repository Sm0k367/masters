import { CHAINS, PRIMARY_SCAN_CHAINS, preferredQuote } from "@/lib/chains";
import { fetchMajors } from "@/lib/coingecko";
import {
  bestPairForSymbol,
  dexBoostedAddresses,
  dexSearch,
  dexTokenPairs,
  dexTrendingMetas,
} from "@/lib/dexscreener";
import { geckoNewPools, geckoTopPools, geckoTrending, isTrenchPair } from "@/lib/gecko";
import { settled } from "@/lib/http";
import { applyBoosts, scoreMany, scorePair } from "@/lib/score";
import type {
  ChainBoard,
  ChainKey,
  DailyBrief,
  HeatStat,
  PairSnapshot,
  ScanResponse,
  ScoredPair,
} from "@/lib/types";

const STICKY_SYMBOLS = ["PONS", "CASHCAT", "AI", "NVDA", "SPY", "SPCX", "META"];

function mergePairs(...groups: (PairSnapshot[] | null)[]): PairSnapshot[] {
  const out: PairSnapshot[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    if (!group) continue;
    for (const pair of group) {
      const key = `${pair.chain}:${pair.pairAddress.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(pair);
    }
  }
  return out;
}

function trench(pairs: PairSnapshot[]): PairSnapshot[] {
  const kept = pairs.filter(isTrenchPair);
  return kept.length ? kept : pairs;
}

function heatFrom(chain: ChainKey, pairs: PairSnapshot[], launches: PairSnapshot[]): HeatStat {
  const volume24h = pairs.reduce((sum, pair) => sum + pair.volume.h24, 0);
  const trades24h = pairs.reduce(
    (sum, pair) => sum + pair.txns.h24.buys + pair.txns.h24.sells,
    0,
  );
  const trenchPairs = pairs.filter(isTrenchPair);
  const top = [...trenchPairs].sort((a, b) => b.volume.h24 - a.volume.h24)[0];
  return {
    chain,
    label: CHAINS[chain].label,
    volume24h,
    trades24h,
    newPools24h: launches.filter((pair) => (pair.ageMs ?? 0) < 86_400_000).length,
    topSymbol: top?.base.symbol ?? null,
  };
}

async function stickyRobinhood(): Promise<PairSnapshot[]> {
  const results = await Promise.all(
    STICKY_SYMBOLS.map((symbol) => settled(dexSearch(symbol))),
  );
  const picked: PairSnapshot[] = [];
  STICKY_SYMBOLS.forEach((symbol, index) => {
    const group = results[index] ?? [];
    const best = bestPairForSymbol(group, symbol, "robinhood");
    if (best) picked.push(best);
  });
  return picked;
}

export async function getDailyBrief(): Promise<DailyBrief> {
  const [
    rhTrend,
    rhNew,
    rhTop,
    solTrend,
    baseTrend,
    sticky,
    majors,
    boosts,
    metas,
  ] = await Promise.all([
    settled(geckoTrending("robinhood")),
    settled(geckoNewPools("robinhood")),
    settled(geckoTopPools("robinhood")),
    settled(geckoTrending("solana")),
    settled(geckoTrending("base")),
    stickyRobinhood(),
    fetchMajors(),
    settled(dexBoostedAddresses()),
    settled(dexTrendingMetas()),
  ]);

  const boosted = boosts ?? new Set<string>();
  const rh = applyBoosts(
    trench(mergePairs(rhTrend, rhNew, rhTop, sticky)),
    boosted,
  );
  const scoredRh = scoreMany(rh);
  const launches = scoreMany(applyBoosts(trench(rhNew ?? []), boosted)).sort(
    (a, b) => (a.ageMs ?? 0) - (b.ageMs ?? 0),
  );
  const movers = [...scoredRh]
    .filter((pair) => Math.abs(pair.change.h24 ?? 0) >= 40)
    .sort((a, b) => Math.abs(b.change.h24 ?? 0) - Math.abs(a.change.h24 ?? 0));
  const volumeLeaders = [...scoredRh].sort((a, b) => b.volume.h24 - a.volume.h24);
  const stickier = scoreMany(sticky).sort((a, b) => b.liquidityUsd - a.liquidityUsd);
  const tokenized = scoredRh.filter((pair) => pair.tokenClass === "tokenized_stock");
  const otherChains = scoreMany(
    applyBoosts(trench(mergePairs(solTrend, baseTrend)), boosted),
  ).sort((a, b) => b.volume.h24 - a.volume.h24);

  const notes = [
    "Nothing on Robinhood Wallet is a reliable will-profit play. New tickers are lottery tickets.",
    "Filter for pool age, liquidity ≥ $50–100k, unique makers, and Wallet Spam / Warning / Suspicious labels.",
    "Uniswap V3/V4 is where size trades. Pons is where brand-new tickers appear.",
    "Tokenized stocks and memes are two different risk profiles. Don’t treat them the same.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    heat: [
      heatFrom("robinhood", mergePairs(rhTrend, rhTop), rhNew ?? []),
      heatFrom("solana", solTrend ?? [], []),
      heatFrom("base", baseTrend ?? [], []),
    ],
    majors,
    stickier: stickier.slice(0, 8),
    volumeLeaders: volumeLeaders.slice(0, 12),
    launches: launches.slice(0, 16),
    movers: movers.slice(0, 12),
    tokenized: tokenized.slice(0, 8),
    otherChains: otherChains.slice(0, 12),
    metas: metas ?? [],
    notes,
    sources: [
      "GeckoTerminal",
      "DexScreener",
      "CoinGecko",
      "GoPlus (diligence)",
      "robinswap.trade / Wallet trending as human cross-check",
    ],
  };
}

export async function getScan(chain: ChainKey): Promise<ScanResponse> {
  const [fresh, trend, boosts] = await Promise.all([
    settled(geckoNewPools(chain)),
    settled(geckoTrending(chain)),
    settled(dexBoostedAddresses()),
  ]);
  const boosted = boosts ?? new Set<string>();
  const newPools = scoreMany(applyBoosts(trench(fresh ?? []), boosted)).sort(
    (a, b) => (a.ageMs ?? Number.MAX_SAFE_INTEGER) - (b.ageMs ?? Number.MAX_SAFE_INTEGER),
  );
  const trending = scoreMany(applyBoosts(trench(trend ?? []), boosted)).sort(
    (a, b) => b.volume.h24 - a.volume.h24,
  );
  return {
    chain,
    generatedAt: new Date().toISOString(),
    newPools,
    trending,
  };
}

export async function getChainBoard(): Promise<ChainBoard> {
  const boosts = (await settled(dexBoostedAddresses())) ?? new Set<string>();
  const boards = await Promise.all(
    PRIMARY_SCAN_CHAINS.map(async (chain) => {
      const trend = (await settled(geckoTrending(chain))) ?? [];
      const scored = scoreMany(applyBoosts(trench(trend), boosts));
      return {
        chain,
        label: CHAINS[chain].label,
        trending: scored.slice(0, 6),
        volume24h: trend.reduce((sum, pair) => sum + pair.volume.h24, 0),
      };
    }),
  );
  return { generatedAt: new Date().toISOString(), boards };
}

export async function resolveToken(
  query: string,
  chainHint?: ChainKey,
): Promise<ScoredPair | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const looksLikeAddress =
    trimmed.startsWith("0x") && trimmed.length >= 42
      ? true
      : !trimmed.includes(" ") && trimmed.length >= 32;

  if (looksLikeAddress) {
    const chains: ChainKey[] = chainHint
      ? [chainHint]
      : ["robinhood", "base", "eth", "bsc", "arbitrum", "solana"];
    for (const chain of chains) {
      const pairs = await settled(dexTokenPairs(chain, trimmed));
      if (pairs && pairs.length) {
        const ranked = [...pairs].sort((a, b) => b.liquidityUsd - a.liquidityUsd);
        const preferred =
          ranked.find((pair) => preferredQuote(pair.quote.symbol, pair.chain)) ?? ranked[0];
        return scorePair(preferred);
      }
    }
  }

  const found = (await settled(dexSearch(trimmed))) ?? [];
  const scoped = chainHint ? found.filter((pair) => pair.chain === chainHint) : found;
  const exact = scoped.filter(
    (pair) => pair.base.symbol.toUpperCase() === trimmed.toUpperCase(),
  );
  const pool = [...(exact.length ? exact : scoped)].sort(
    (a, b) => b.liquidityUsd - a.liquidityUsd,
  )[0];
  return pool ? scorePair(pool) : null;
}

