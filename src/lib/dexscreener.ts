import { CHAINS, chainFromDex } from "@/lib/chains";
import { cached, fetchJsonRetry } from "@/lib/http";
import type { ChainKey, PairSnapshot, TxnWindow } from "@/lib/types";

const DEX = "https://api.dexscreener.com";

type DexToken = { address: string; name: string; symbol: string };
type DexTxn = { buys?: number; sells?: number };

type DexPair = {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[] | null;
  baseToken: DexToken;
  quoteToken: DexToken;
  priceNative?: string;
  priceUsd?: string | null;
  txns?: Record<string, DexTxn>;
  volume?: Record<string, number>;
  priceChange?: Record<string, number> | null;
  liquidity?: { usd?: number | null; base?: number; quote?: number } | null;
  fdv?: number | null;
  marketCap?: number | null;
  pairCreatedAt?: number | null;
  info?: { imageUrl?: string | null } | null;
  boosts?: { active?: number } | null;
};

function windowFrom(tx?: DexTxn): TxnWindow {
  return { buys: tx?.buys ?? 0, sells: tx?.sells ?? 0 };
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function dexToPair(raw: DexPair): PairSnapshot | null {
  const chain = chainFromDex(raw.chainId);
  if (!chain) return null;
  const createdMs = raw.pairCreatedAt ?? null;
  return {
    id: `${chain}:${raw.pairAddress}`,
    chain,
    chainLabel: CHAINS[chain].label,
    dex: raw.dexId,
    dexLabel: `${raw.dexId}${(raw.labels ?? []).length ? " " + (raw.labels ?? []).join(" ") : ""}`,
    pairAddress: raw.pairAddress,
    url: raw.url,
    base: raw.baseToken,
    quote: raw.quoteToken,
    priceUsd: numOrNull(raw.priceUsd),
    priceNative: numOrNull(raw.priceNative),
    change: {
      m5: numOrNull(raw.priceChange?.m5),
      m15: numOrNull(raw.priceChange?.m15),
      m30: numOrNull(raw.priceChange?.m30),
      h1: numOrNull(raw.priceChange?.h1),
      h6: numOrNull(raw.priceChange?.h6),
      h24: numOrNull(raw.priceChange?.h24),
    },
    volume: {
      m5: num(raw.volume?.m5),
      h1: num(raw.volume?.h1),
      h6: num(raw.volume?.h6),
      h24: num(raw.volume?.h24),
    },
    txns: {
      m5: windowFrom(raw.txns?.m5),
      h1: windowFrom(raw.txns?.h1),
      h6: windowFrom(raw.txns?.h6),
      h24: windowFrom(raw.txns?.h24),
    },
    liquidityUsd: num(raw.liquidity?.usd),
    fdvUsd: numOrNull(raw.fdv),
    marketCapUsd: numOrNull(raw.marketCap),
    createdAt: createdMs ? new Date(createdMs).toISOString() : null,
    ageMs: createdMs ? Date.now() - createdMs : null,
    imageUrl: raw.info?.imageUrl ?? null,
    boosted: (raw.boosts?.active ?? 0) > 0,
    labels: raw.labels ?? [],
  };
}

export async function dexSearch(query: string): Promise<PairSnapshot[]> {
  const q = query.trim();
  if (!q) return [];
  return cached(`dex:search:${q.toLowerCase()}`, 20_000, async () => {
    const body = await fetchJsonRetry<{ pairs?: DexPair[] }>(
      `${DEX}/latest/dex/search?q=${encodeURIComponent(q)}`,
    );
    return (body.pairs ?? [])
      .map(dexToPair)
      .filter((pair): pair is PairSnapshot => pair !== null);
  });
}

export async function dexTokenPairs(
  chainKey: ChainKey,
  tokenAddress: string,
): Promise<PairSnapshot[]> {
  const chain = CHAINS[chainKey];
  return cached(`dex:token:${chain.dex}:${tokenAddress.toLowerCase()}`, 15_000, async () => {
    const body = await fetchJsonRetry<DexPair[] | { pairs?: DexPair[] }>(
      `${DEX}/token-pairs/v1/${chain.dex}/${tokenAddress}`,
    );
    const list = Array.isArray(body) ? body : (body.pairs ?? []);
    return list.map(dexToPair).filter((pair): pair is PairSnapshot => pair !== null);
  });
}

export async function dexBoostedAddresses(): Promise<Set<string>> {
  return cached("dex:boosts", 60_000, async () => {
    const body = await fetchJsonRetry<
      { chainId?: string; tokenAddress?: string }[]
    >(`${DEX}/token-boosts/latest/v1`);
    const set = new Set<string>();
    for (const item of body) {
      if (item.chainId && item.tokenAddress) {
        set.add(`${item.chainId}:${item.tokenAddress.toLowerCase()}`);
      }
    }
    return set;
  });
}

export async function dexTrendingMetas(): Promise<
  { name: string; slug: string; volume: number; tokenCount: number; change24h: number }[]
> {
  return cached("dex:metas", 60_000, async () => {
    const body = await fetchJsonRetry<
      {
        name: string;
        slug: string;
        volume: number;
        tokenCount: number;
        marketCapChange?: { h24?: number };
      }[]
    >(`${DEX}/metas/trending/v1`);
    return body.slice(0, 8).map((meta) => ({
      name: meta.name,
      slug: meta.slug,
      volume: meta.volume,
      tokenCount: meta.tokenCount,
      change24h: meta.marketCapChange?.h24 ?? 0,
    }));
  });
}

export function bestPairForSymbol(
  pairs: PairSnapshot[],
  symbol: string,
  chain?: ChainKey,
): PairSnapshot | null {
  const upper = symbol.toUpperCase();
  const matches = pairs.filter((pair) => {
    if (chain && pair.chain !== chain) return false;
    return pair.base.symbol.toUpperCase() === upper;
  });
  return (
    [...matches].sort((a, b) => b.liquidityUsd - a.liquidityUsd)[0] ?? null
  );
}
