import { CHAINS } from "@/lib/chains";
import { dexSearch } from "@/lib/dexscreener";
import { goplusSecurity } from "@/lib/goplus";
import { honeypotSim } from "@/lib/honeypot";
import { settled } from "@/lib/http";
import { resolveToken } from "@/lib/markets";
import { solanaRugCheck } from "@/lib/rugcheck";
import { buildKillSwitches, buildRugChecks, buildRugMeter } from "@/lib/rug";
import type { ChainKey, DiligenceReport, PairSnapshot } from "@/lib/types";

function emptyMeter(): DiligenceReport["meter"] {
  return {
    score: 0,
    verdict: "hard_no",
    headline: "Could not resolve that ticker or address. Paste the exact contract.",
    hardFails: 1,
    warns: 0,
  };
}

export async function runDiligence(
  query: string,
  chainHint?: ChainKey,
): Promise<DiligenceReport> {
  const pair = await resolveToken(query, chainHint);
  const chain = pair?.chain ?? chainHint ?? "robinhood";
  const generatedAt = new Date().toISOString();

  if (!pair) {
    return {
      pair: null,
      query,
      chain,
      clones: [],
      checks: [
        {
          id: "resolve",
          category: "tape",
          label: "Resolve contract",
          status: "fail",
          detail: "Could not resolve that ticker or address on the public tape. Paste the exact contract.",
        },
      ],
      meter: emptyMeter(),
      killSwitches: [],
      goplus: null,
      sim: null,
      solana: null,
      holders: [],
      lp: null,
      top10Percent: null,
      creatorPercent: null,
      ownerPercent: null,
      sources: [{ name: "DexScreener", ok: false, note: "No pair" }],
      generatedAt,
    };
  }

  const [search, security, sim, solana] = await Promise.all([
    settled(dexSearch(pair.base.symbol)),
    settled(goplusSecurity(chain, pair.base.address)),
    settled(honeypotSim(chain, pair.base.address)),
    settled(solanaRugCheck(chain, pair.base.address)),
  ]);

  const clones: PairSnapshot[] = (search ?? [])
    .filter(
      (item) =>
        item.chain === pair.chain &&
        item.base.symbol.toUpperCase() === pair.base.symbol.toUpperCase() &&
        item.base.address.toLowerCase() !== pair.base.address.toLowerCase(),
    )
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
    .slice(0, 8);

  const checks = buildRugChecks({
    pair,
    goplus: security,
    sim,
    solana,
    cloneCount: clones.length,
    query,
  });
  const meter = buildRugMeter(checks);
  const killSwitches = buildKillSwitches(security, sim, solana);

  const holders =
    (security?.holders.length ? security.holders : solana?.holders) ?? [];

  const sources: DiligenceReport["sources"] = [
    {
      name: "DexScreener",
      ok: true,
      note: `${pair.dexLabel} · ${pair.chainLabel}`,
    },
    {
      name: "GoPlus",
      ok: Boolean(security),
      note: security
        ? `${CHAINS[chain].label} token security`
        : CHAINS[chain].goplus
          ? "No payload"
          : "Chain not covered",
    },
    {
      name: "Honeypot.is",
      ok: Boolean(sim),
      note: sim ? "Live buy/sell sim" : "No sim on this chain",
    },
    {
      name: "RugCheck.xyz",
      ok: Boolean(solana),
      note: chain === "solana" ? (solana ? "Mint report" : "No report") : "Solana only",
    },
  ];

  return {
    pair,
    query,
    chain,
    clones,
    checks,
    meter,
    killSwitches,
    goplus: security
      ? {
          mintable: security.mintable,
          freezeable: security.freezeable,
          honeypot: security.honeypot,
          blacklist: security.blacklist,
          hiddenOwner: security.hiddenOwner,
          ownerRenounced: security.ownerRenounced,
          openSource: security.openSource,
          isProxy: security.isProxy,
          buyTax: security.buyTax,
          sellTax: security.sellTax,
          creatorPercent: security.creatorPercent,
          ownerPercent: security.ownerPercent,
          holderCount: security.holderCount,
        }
      : null,
    sim: sim
      ? {
          source: "honeypot.is",
          isHoneypot: sim.isHoneypot,
          buyTax: sim.buyTax,
          sellTax: sim.sellTax,
          transferTax: sim.transferTax,
          buyGas: sim.buyGas,
          sellGas: sim.sellGas,
          risk: sim.risk,
          openSource: sim.openSource,
          holderFailedPct: sim.holderFailedPct,
          simulationSuccess: sim.simulationSuccess,
          flags: sim.flags,
        }
      : null,
    solana: solana
      ? {
          rugged: solana.rugged,
          riskScore: solana.riskScore,
          mintAuthority: solana.mintAuthority,
          freezeAuthority: solana.freezeAuthority,
          mutableMetadata: solana.mutableMetadata,
          risks: solana.risks.map((risk) => ({
            name: risk.name,
            level: risk.level,
            description: risk.description,
          })),
        }
      : null,
    holders,
    lp: security
      ? {
          lockedPct: security.lpLockedPct,
          burnedPct: security.lpBurnedPct,
          holderCount: security.lpHolderCount,
          unlockedTop: security.lpHolders.filter((row) => !row.locked).slice(0, 5),
        }
      : null,
    top10Percent: security?.top10Percent ?? null,
    creatorPercent: security?.creatorPercent ?? null,
    ownerPercent: security?.ownerPercent ?? null,
    sources,
    generatedAt,
  };
}
