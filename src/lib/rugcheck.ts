import { cached, fetchJsonRetry, settled } from "@/lib/http";
import type { HolderRow } from "@/lib/goplus";
import type { ChainKey } from "@/lib/types";

export type RugCheckRisk = {
  name: string;
  level: string;
  description: string;
  score: number;
};

export type SolanaRug = {
  available: boolean;
  rugged: boolean;
  riskScore: number | null;
  freezeAuthority: boolean;
  mintAuthority: boolean;
  mutableMetadata: boolean;
  totalLpUsd: number | null;
  totalHolders: number | null;
  risks: RugCheckRisk[];
  holders: HolderRow[];
};

type Raw = {
  rugged?: boolean;
  score?: number;
  score_normalised?: number;
  freezeAuthority?: string | null;
  mintAuthority?: string | null;
  token?: { freezeAuthority?: string | null; mintAuthority?: string | null };
  tokenMeta?: { mutable?: boolean };
  totalMarketLiquidity?: number;
  totalHolders?: number;
  risks?: { name?: string; level?: string; description?: string; score?: number }[];
  topHolders?: { address?: string; owner?: string; pct?: number; insider?: boolean }[];
};

export async function solanaRugCheck(
  chain: ChainKey,
  mint: string,
): Promise<SolanaRug | null> {
  if (chain !== "solana") return null;
  return cached(`rugcheck:${mint}`, 45_000, async () => {
    const body = await settled(
      fetchJsonRetry<Raw>(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`, {
        timeoutMs: 14_000,
      }, 2),
    );
    if (!body) return null;
    const freeze = body.freezeAuthority ?? body.token?.freezeAuthority ?? null;
    const mintAuth = body.mintAuthority ?? body.token?.mintAuthority ?? null;
    return {
      available: true,
      rugged: Boolean(body.rugged),
      riskScore: body.score_normalised ?? body.score ?? null,
      freezeAuthority: Boolean(freeze),
      mintAuthority: Boolean(mintAuth),
      mutableMetadata: Boolean(body.tokenMeta?.mutable),
      totalLpUsd: body.totalMarketLiquidity ?? null,
      totalHolders: body.totalHolders ?? null,
      risks: (body.risks ?? []).map((risk) => ({
        name: risk.name ?? "Risk",
        level: risk.level ?? "warn",
        description: risk.description ?? "",
        score: risk.score ?? 0,
      })),
      holders: (body.topHolders ?? []).slice(0, 10).map((row) => ({
        address: row.owner ?? row.address ?? "",
        percent: row.pct ?? 0,
        locked: false,
        tag: row.insider ? "insider" : "",
        isContract: false,
      })),
    };
  });
}
