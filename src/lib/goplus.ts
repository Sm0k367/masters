import { CHAINS } from "@/lib/chains";
import { cached, fetchJsonRetry, settled } from "@/lib/http";
import type { ChainKey } from "@/lib/types";

export type HolderRow = {
  address: string;
  percent: number;
  locked: boolean;
  tag: string;
  isContract: boolean;
};

export type LpHolder = HolderRow;

export type GoPlusReport = {
  available: boolean;
  chainKind: "evm" | "solana";
  honeypot: boolean;
  cannotBuy: boolean;
  cannotSellAll: boolean;
  buyTax: number | null;
  sellTax: number | null;
  transferTax: number | null;
  mintable: boolean;
  freezeable: boolean;
  blacklist: boolean;
  whitelist: boolean;
  hiddenOwner: boolean;
  ownerRenounced: boolean;
  openSource: boolean | null;
  isProxy: boolean;
  selfdestruct: boolean;
  transferPausable: boolean;
  tradingCooldown: boolean;
  canTakeBackOwnership: boolean;
  ownerChangeBalance: boolean;
  slippageModifiable: boolean;
  personalSlippageModifiable: boolean;
  antiWhale: boolean;
  antiWhaleModifiable: boolean;
  externalCall: boolean;
  honeypotSameCreator: boolean;
  inDex: boolean;
  metadataMutable: boolean;
  closable: boolean;
  trustedToken: boolean;
  holderCount: number | null;
  holders: HolderRow[];
  top10Percent: number | null;
  creatorAddress: string | null;
  creatorPercent: number | null;
  ownerAddress: string | null;
  ownerPercent: number | null;
  lpHolders: LpHolder[];
  lpHolderCount: number | null;
  lpLockedPct: number | null;
  lpBurnedPct: number | null;
  totalSupply: string | null;
};

const BURN = new Set([
  "0x000000000000000000000000000000000000dead",
  "0x0000000000000000000000000000000000000000",
  "11111111111111111111111111111111",
]);

function flag(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "object" && value && "status" in value) {
    return flag((value as { status: unknown }).status);
  }
  const s = String(value).toLowerCase();
  return s === "1" || s === "true";
}

function parseTax(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n <= 1 && n > 0 ? n * 100 : n;
}

function parsePercent(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? n * 100 : n;
}

function asString(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

function mapHolders(raw: unknown, limit = 12): HolderRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, limit).map((holder) => {
    const row = holder as {
      address?: string;
      percent?: string | number;
      is_locked?: number | string;
      tag?: string;
      is_contract?: number | string;
      account_address?: string;
    };
    return {
      address: row.address ?? row.account_address ?? "",
      percent: parsePercent(row.percent),
      locked: row.is_locked === 1 || row.is_locked === "1",
      tag: row.tag ?? "",
      isContract: row.is_contract === 1 || row.is_contract === "true",
    };
  });
}

function lpStats(holders: HolderRow[]): { lockedPct: number; burnedPct: number } {
  let lockedPct = 0;
  let burnedPct = 0;
  for (const holder of holders) {
    const addr = holder.address.toLowerCase();
    if (BURN.has(addr) || holder.tag.toLowerCase().includes("burn")) {
      burnedPct += holder.percent;
      lockedPct += holder.percent;
      continue;
    }
    if (holder.locked) lockedPct += holder.percent;
  }
  return {
    lockedPct: Math.min(100, lockedPct),
    burnedPct: Math.min(100, burnedPct),
  };
}

function isZeroAddress(value: string | null): boolean {
  if (!value) return true;
  const addr = value.toLowerCase();
  return BURN.has(addr) || addr === "null" || addr === "none";
}

function parseEvm(entry: Record<string, unknown>): GoPlusReport {
  const holders = mapHolders(entry.holders);
  const lpHolders = mapHolders(entry.lp_holders, 8);
  const { lockedPct, burnedPct } = lpStats(lpHolders);
  const circulating = holders.filter((holder) => !BURN.has(holder.address.toLowerCase()));
  const owner = asString(entry.owner_address);
  return {
    available: true,
    chainKind: "evm",
    honeypot: flag(entry.is_honeypot) || flag(entry.cannot_buy),
    cannotBuy: flag(entry.cannot_buy),
    cannotSellAll: flag(entry.cannot_sell_all),
    buyTax: parseTax(entry.buy_tax),
    sellTax: parseTax(entry.sell_tax),
    transferTax: parseTax(entry.transfer_tax),
    mintable: flag(entry.is_mintable),
    freezeable: false,
    blacklist: flag(entry.is_blacklisted),
    whitelist: flag(entry.is_whitelisted),
    hiddenOwner: flag(entry.hidden_owner),
    ownerRenounced: isZeroAddress(owner) && Number(entry.owner_percent ?? 0) === 0,
    openSource: entry.is_open_source == null || entry.is_open_source === "" ? null : flag(entry.is_open_source),
    isProxy: flag(entry.is_proxy),
    selfdestruct: flag(entry.selfdestruct),
    transferPausable: flag(entry.transfer_pausable),
    tradingCooldown: flag(entry.trading_cooldown),
    canTakeBackOwnership: flag(entry.can_take_back_ownership),
    ownerChangeBalance: flag(entry.owner_change_balance),
    slippageModifiable: flag(entry.slippage_modifiable),
    personalSlippageModifiable: flag(entry.personal_slippage_modifiable),
    antiWhale: flag(entry.is_anti_whale),
    antiWhaleModifiable: flag(entry.anti_whale_modifiable),
    externalCall: flag(entry.external_call),
    honeypotSameCreator: flag(entry.honeypot_with_same_creator),
    inDex: flag(entry.is_in_dex),
    metadataMutable: false,
    closable: false,
    trustedToken: false,
    holderCount: entry.holder_count ? Number(entry.holder_count) : null,
    holders,
    top10Percent: circulating.reduce((sum, holder) => sum + holder.percent, 0),
    creatorAddress: asString(entry.creator_address),
    creatorPercent: parsePercent(entry.creator_percent),
    ownerAddress: owner,
    ownerPercent: parsePercent(entry.owner_percent),
    lpHolders,
    lpHolderCount: entry.lp_holder_count ? Number(entry.lp_holder_count) : lpHolders.length,
    lpLockedPct: lpHolders.length ? lockedPct : null,
    lpBurnedPct: lpHolders.length ? burnedPct : null,
    totalSupply: asString(entry.total_supply),
  };
}

function parseSolana(entry: Record<string, unknown>): GoPlusReport {
  const holders = mapHolders(entry.holders);
  const lpHolders = mapHolders(entry.lp_holders, 8);
  const { lockedPct, burnedPct } = lpStats(lpHolders);
  const circulating = holders.filter((holder) => !BURN.has(holder.address.toLowerCase()));
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  return {
    available: true,
    chainKind: "solana",
    honeypot: false,
    cannotBuy: false,
    cannotSellAll: flag(entry.non_transferable),
    buyTax: parseTax((entry.transfer_fee as { current_fee_rate?: unknown } | undefined)?.current_fee_rate),
    sellTax: null,
    transferTax: parseTax((entry.transfer_fee as { current_fee_rate?: unknown } | undefined)?.current_fee_rate),
    mintable: flag(entry.mintable),
    freezeable: flag(entry.freezable),
    blacklist: false,
    whitelist: false,
    hiddenOwner: false,
    ownerRenounced: !flag(entry.mintable) && !flag(entry.freezable),
    openSource: null,
    isProxy: false,
    selfdestruct: false,
    transferPausable: false,
    tradingCooldown: false,
    canTakeBackOwnership: flag(entry.balance_mutable_authority),
    ownerChangeBalance: flag(entry.balance_mutable_authority),
    slippageModifiable: false,
    personalSlippageModifiable: false,
    antiWhale: false,
    antiWhaleModifiable: false,
    externalCall: false,
    honeypotSameCreator: false,
    inDex: Array.isArray(entry.dex) && entry.dex.length > 0,
    metadataMutable: flag(entry.metadata_mutable) || flag(metadata.mutable),
    closable: flag(entry.closable),
    trustedToken: flag(entry.trusted_token),
    holderCount: entry.holder_count ? Number(entry.holder_count) : null,
    holders,
    top10Percent: circulating.reduce((sum, holder) => sum + holder.percent, 0),
    creatorAddress: asString((entry.metadata as { update_authority?: unknown } | undefined)?.update_authority),
    creatorPercent: null,
    ownerAddress: null,
    ownerPercent: null,
    lpHolders,
    lpHolderCount: lpHolders.length || null,
    lpLockedPct: lpHolders.length ? lockedPct : null,
    lpBurnedPct: lpHolders.length ? burnedPct : null,
    totalSupply: asString(entry.total_supply),
  };
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
      body.result[tokenAddress.toLowerCase()] ??
      body.result[tokenAddress] ??
      Object.values(body.result)[0];
    if (!entry) return null;
    return chain.goplus === "solana" ? parseSolana(entry) : parseEvm(entry);
  });
}
