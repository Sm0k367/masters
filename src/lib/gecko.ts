import { CHAINS, chainFromGecko, isQuoteSymbol, type ChainConfig } from "@/lib/chains";
import { cached, fetchJsonRetry } from "@/lib/http";
import type { ChainKey, PairSnapshot, TxnWindow } from "@/lib/types";

const GECKO = "https://api.geckoterminal.com/api/v2";

type GeckoResource = {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
};

type GeckoPool = {
  id: string;
  type: string;
  attributes: {
    address: string;
    name: string;
    pool_created_at: string | null;
    base_token_price_usd: string | null;
    base_token_price_native_currency: string | null;
    fdv_usd: string | number | null;
    market_cap_usd: string | number | null;
    reserve_in_usd: string | null;
    price_change_percentage: Record<string, string | number | null>;
    transactions: Record<string, { buys?: number; sells?: number; buyers?: number; sellers?: number }>;
    volume_usd: Record<string, string | number | null>;
  };
  relationships: {
    base_token?: { data: { id: string; type: string } | null };
    quote_token?: { data: { id: string; type: string } | null };
    dex?: { data: { id: string; type: string } | null };
  };
};

type GeckoList = {
  data?: GeckoPool[];
  included?: GeckoResource[];
};

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function windowFrom(
  tx: GeckoPool["attributes"]["transactions"][string] | undefined,
): TxnWindow {
  return {
    buys: tx?.buys ?? 0,
    sells: tx?.sells ?? 0,
    buyers: tx?.buyers,
    sellers: tx?.sellers,
  };
}

function lookup(
  included: GeckoResource[] | undefined,
  rel: { id: string; type: string } | null | undefined,
): { address: string; name: string; symbol: string; image?: string | null } {
  if (!rel) return { address: "", name: "Unknown", symbol: "?" };
  const hit = included?.find((item) => item.id === rel.id && item.type === rel.type);
  const attrs = (hit?.attributes ?? {}) as {
    address?: string;
    name?: string;
    symbol?: string;
    image_url?: string | null;
  };
  const address = attrs.address ?? rel.id.split("_").slice(1).join("_");
  return {
    address,
    name: attrs.name ?? "Unknown",
    symbol: attrs.symbol ?? "?",
    image: attrs.image_url,
  };
}

function parsePoolName(name: string): { base: string; quote: string } {
  const [left, right] = name.split("/").map((part) => part.trim());
  const quote = (right ?? "").split(/\s+/)[0] ?? "?";
  const base = (left ?? "?").split(/\s+/)[0] ?? "?";
  return { base, quote };
}

export function geckoToPair(
  pool: GeckoPool,
  included: GeckoResource[] | undefined,
  chain: ChainConfig,
): PairSnapshot {
  const baseRel = pool.relationships.base_token?.data;
  const quoteRel = pool.relationships.quote_token?.data;
  const dexRel = pool.relationships.dex?.data;
  const parsed = parsePoolName(pool.attributes.name);
  const base = lookup(included, baseRel);
  const quote = lookup(included, quoteRel);
  if (base.symbol === "?") base.symbol = parsed.base;
  if (quote.symbol === "?") quote.symbol = parsed.quote;
  const createdAt = pool.attributes.pool_created_at;
  const createdMs = createdAt ? Date.parse(createdAt) : NaN;
  const dexId = dexRel?.id ?? "unknown";
  const change = pool.attributes.price_change_percentage ?? {};
  const volume = pool.attributes.volume_usd ?? {};
  const tx = pool.attributes.transactions ?? {};
  const pairAddress = pool.attributes.address;
  return {
    id: `${chain.key}:${pairAddress}`,
    chain: chain.key,
    chainLabel: chain.label,
    dex: dexId,
    dexLabel: dexId.replace(/-/g, " "),
    pairAddress,
    url: `https://www.geckoterminal.com/${chain.gecko}/pools/${pairAddress}`,
    base: {
      address: base.address,
      name: base.name,
      symbol: base.symbol,
    },
    quote: {
      address: quote.address,
      name: quote.name,
      symbol: quote.symbol,
    },
    priceUsd: numOrNull(pool.attributes.base_token_price_usd),
    priceNative: numOrNull(pool.attributes.base_token_price_native_currency),
    change: {
      m5: numOrNull(change.m5),
      m15: numOrNull(change.m15),
      m30: numOrNull(change.m30),
      h1: numOrNull(change.h1),
      h6: numOrNull(change.h6),
      h24: numOrNull(change.h24),
    },
    volume: {
      m5: num(volume.m5),
      h1: num(volume.h1),
      h6: num(volume.h6),
      h24: num(volume.h24),
    },
    txns: {
      m5: windowFrom(tx.m5),
      h1: windowFrom(tx.h1),
      h6: windowFrom(tx.h6),
      h24: windowFrom(tx.h24),
    },
    liquidityUsd: num(pool.attributes.reserve_in_usd),
    fdvUsd: numOrNull(pool.attributes.fdv_usd),
    marketCapUsd: numOrNull(pool.attributes.market_cap_usd),
    createdAt,
    ageMs: Number.isFinite(createdMs) ? Date.now() - createdMs : null,
    imageUrl: base.image ?? null,
    boosted: false,
    labels: [],
  };
}

async function geckoList(
  path: string,
  chain: ChainConfig,
): Promise<PairSnapshot[]> {
  return cached(`gecko:${path}`, 45_000, async () => {
    const body = await fetchJsonRetry<GeckoList>(
      `${GECKO}${path}?include=base_token,quote_token,dex`,
    );
    return (body.data ?? []).map((pool) => geckoToPair(pool, body.included, chain));
  });
}

export async function geckoTrending(chainKey: ChainKey): Promise<PairSnapshot[]> {
  const chain = CHAINS[chainKey];
  return geckoList(`/networks/${chain.gecko}/trending_pools`, chain);
}

export async function geckoNewPools(chainKey: ChainKey): Promise<PairSnapshot[]> {
  const chain = CHAINS[chainKey];
  return geckoList(`/networks/${chain.gecko}/new_pools`, chain);
}

export async function geckoTopPools(chainKey: ChainKey): Promise<PairSnapshot[]> {
  const chain = CHAINS[chainKey];
  return geckoList(`/networks/${chain.gecko}/pools`, chain);
}

export async function geckoTokenPools(
  chainKey: ChainKey,
  address: string,
): Promise<PairSnapshot[]> {
  const chain = CHAINS[chainKey];
  return geckoList(
    `/networks/${chain.gecko}/tokens/${address}/pools`,
    chain,
  );
}

export function isTrenchPair(pair: PairSnapshot): boolean {
  const baseQuote = isQuoteSymbol(pair.base.symbol);
  const quoteQuote = isQuoteSymbol(pair.quote.symbol);
  // Keep inverted books (USDT0/WXPL). Drop only quote-quote stables.
  return !(baseQuote && quoteQuote);
}

export function chainFromNetworkId(id: string): ChainKey | null {
  return chainFromGecko(id);
}
