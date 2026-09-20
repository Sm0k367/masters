import { CHAINS } from "@/lib/chains";
import { cached, fetchJsonRetry, settled } from "@/lib/http";
import type { ChainKey } from "@/lib/types";

export type HolderRow = {
  address: string;
  percent: number;
  locked: boolean;
  tag: string;
};

export type GoPlusReport = {
  available: boolean;
  raw: Record<string, string>;
  honeypot: boolean;
  cannotBuy: boolean;
  buyTax: number | null;
  sellTax: number | null;
  mintable: boolean;
  blacklist: boolean;
  hiddenOwner: boolean;
  ownerRenounced: boolean;
  openSource: boolean | null;
  holderCount: number | null;
  holders: HolderRow[];
  top10Percent: number | null;
};

function flag(value: string | undefined): boolean {
  return value === "1" || value === "true";
}

function parseTax(value: string | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n <= 1 && n > 0 ? n * 100 : n;
}

function parsePercent(value: string | undefined): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? n * 100 : n;
}

function asStringMap(input: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = String(value);
    }
  }
  return out;
}

export async function goplusSecurity(
  chainKey: ChainKey,
  tokenAddress: string,
): Promise<GoPlusReport | null> {
  const chain = CHAINS[chainKey];
  if (!chain.goplus) return null;
  return cached(`goplus:${chain.key}:${tokenAddress.toLowerCase()}`, 45_000, async () => {
    const endpoint =
      chain.goplus === "solana"
        ? `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${tokenAddress}`
        : `https://api.gopluslabs.io/api/v1/token_security/${chain.goplus}?contract_addresses=${tokenAddress}`;
    const body = await settled(
      fetchJsonRetry<{ result?: Record<string, Record<string, unknown>> }>(endpoint),
    );
    if (!body?.result) return null;
    const entry =
      body.result[tokenAddress.toLowerCase()] ?? Object.values(body.result)[0];
    if (!entry) return null;
    const raw = asStringMap(entry);
    const holdersRaw = Array.isArray(entry.holders) ? entry.holders : [];
    const burn = new Set([
      "0x000000000000000000000000000000000000dead",
      "0x0000000000000000000000000000000000000000",
    ]);
    const holders: HolderRow[] = holdersRaw.slice(0, 10).map((holder) => {
      const row = holder as {
        address?: string;
        percent?: string;
        is_locked?: number | string;
        tag?: string;
      };
      return {
        address: row.address ?? "",
        percent: parsePercent(row.percent),
        locked: row.is_locked === 1 || row.is_locked === "1",
        tag: row.tag ?? "",
      };
    });
    const circulating = holders.filter(
      (holder) => !burn.has(holder.address.toLowerCase()),
    );
    const top10Percent = circulating.reduce((sum, holder) => sum + holder.percent, 0);
    const owner = (entry.owner_address as string | null | undefined) ?? "";
    return {
      available: true,
      raw,
      honeypot: flag(raw.is_honeypot) || flag(raw.cannot_buy),
      cannotBuy: flag(raw.cannot_buy),
      buyTax: parseTax(raw.buy_tax),
      sellTax: parseTax(raw.sell_tax),
      mintable: flag(raw.is_mintable),
      blacklist: flag(raw.is_blacklisted),
      hiddenOwner: flag(raw.hidden_owner),
      ownerRenounced:
        !owner ||
        owner === "0x0000000000000000000000000000000000000000" ||
        owner.toLowerCase() === "0x000000000000000000000000000000000000dead",
      openSource: raw.is_open_source ? flag(raw.is_open_source) : null,
      holderCount: raw.holder_count ? Number(raw.holder_count) : null,
      holders,
      top10Percent,
    };
  });
}
