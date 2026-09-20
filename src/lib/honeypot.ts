import { cached, fetchJsonRetry, settled } from "@/lib/http";
import type { ChainKey } from "@/lib/types";

export type HoneypotSim = {
  available: boolean;
  isHoneypot: boolean | null;
  buyTax: number | null;
  sellTax: number | null;
  transferTax: number | null;
  buyGas: number | null;
  sellGas: number | null;
  risk: string | null;
  riskLevel: number | null;
  openSource: boolean | null;
  isProxy: boolean | null;
  holderFailedPct: number | null;
  simulationSuccess: boolean | null;
  flags: string[];
};

const CHAIN_ID: Partial<Record<ChainKey, number>> = {
  eth: 1,
  bsc: 56,
  base: 8453,
  arbitrum: 42161,
};

type Raw = {
  simulationSuccess?: boolean;
  honeypotResult?: { isHoneypot?: boolean };
  simulationResult?: {
    buyTax?: number;
    sellTax?: number;
    transferTax?: number;
    buyGas?: string | number;
    sellGas?: string | number;
  };
  summary?: { risk?: string; riskLevel?: number };
  contractCode?: { openSource?: boolean; isProxy?: boolean };
  holderAnalysis?: { holders?: string; failed?: string };
  flags?: string[];
};

export function honeypotSupported(chain: ChainKey): boolean {
  return chain in CHAIN_ID;
}

export async function honeypotSim(
  chain: ChainKey,
  tokenAddress: string,
): Promise<HoneypotSim | null> {
  const chainId = CHAIN_ID[chain];
  if (!chainId) return null;
  return cached(`honeypot:${chain}:${tokenAddress.toLowerCase()}`, 40_000, async () => {
    const body = await settled(
      fetchJsonRetry<Raw>(
        `https://api.honeypot.is/v2/IsHoneypot?address=${tokenAddress}&chainID=${chainId}`,
        { timeoutMs: 14_000 },
        2,
      ),
    );
    if (!body) return null;
    const holders = Number(body.holderAnalysis?.holders ?? 0);
    const failed = Number(body.holderAnalysis?.failed ?? 0);
    return {
      available: true,
      isHoneypot: body.honeypotResult?.isHoneypot ?? null,
      buyTax: body.simulationResult?.buyTax ?? null,
      sellTax: body.simulationResult?.sellTax ?? null,
      transferTax: body.simulationResult?.transferTax ?? null,
      buyGas: body.simulationResult?.buyGas != null ? Number(body.simulationResult.buyGas) : null,
      sellGas: body.simulationResult?.sellGas != null ? Number(body.simulationResult.sellGas) : null,
      risk: body.summary?.risk ?? null,
      riskLevel: body.summary?.riskLevel ?? null,
      openSource: body.contractCode?.openSource ?? null,
      isProxy: body.contractCode?.isProxy ?? null,
      holderFailedPct: holders > 0 ? (failed / holders) * 100 : null,
      simulationSuccess: body.simulationSuccess ?? null,
      flags: body.flags ?? [],
    };
  });
}
