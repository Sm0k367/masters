import { CHAINS } from "@/lib/chains";
import { dexSearch } from "@/lib/dexscreener";
import { goplusSecurity } from "@/lib/goplus";
import { settled } from "@/lib/http";
import { resolveToken } from "@/lib/markets";
import { scorePair } from "@/lib/score";
import type { ChainKey, DiligenceCheck, DiligenceReport, PairSnapshot } from "@/lib/types";

function check(
  id: string,
  label: string,
  status: DiligenceCheck["status"],
  detail: string,
): DiligenceCheck {
  return { id, label, status, detail };
}

export async function runDiligence(
  query: string,
  chainHint?: ChainKey,
): Promise<DiligenceReport> {
  const pair = await resolveToken(query, chainHint);
  const chain = pair?.chain ?? chainHint ?? "robinhood";
  const checks: DiligenceCheck[] = [];
  let clones: PairSnapshot[] = [];
  let goplus: DiligenceReport["goplus"] = null;
  let holders: DiligenceReport["holders"] = [];
  let top10Percent: number | null = null;

  if (!pair) {
    checks.push(
      check(
        "resolve",
        "Resolve contract",
        "fail",
        "Could not resolve that ticker or address on the public tape. Paste the exact contract.",
      ),
    );
    return {
      pair: null,
      query,
      chain,
      clones: [],
      checks,
      goplus: null,
      holders: [],
      top10Percent: null,
      generatedAt: new Date().toISOString(),
    };
  }

  checks.push(
    check(
      "resolve",
      "One token, not a vibe",
      "pass",
      `${pair.base.name} (${pair.base.symbol}) on ${pair.chainLabel}. ${pair.base.address}`,
    ),
  );

  const search = await settled(dexSearch(pair.base.symbol));
  clones = (search ?? [])
    .filter(
      (item) =>
        item.chain === pair.chain &&
        item.base.symbol.toUpperCase() === pair.base.symbol.toUpperCase() &&
        item.base.address.toLowerCase() !== pair.base.address.toLowerCase(),
    )
    .sort((a, b) => b.liquidityUsd - a.liquidityUsd)
    .slice(0, 6);

  if (clones.length) {
    checks.push(
      check(
        "clone",
        "Clone ticker check",
        "warn",
        `${clones.length} other ${pair.base.symbol} contract(s) on ${pair.chainLabel}. Confirm you have the one with real liquidity.`,
      ),
    );
  } else {
    checks.push(
      check(
        "clone",
        "Clone ticker check",
        "pass",
        `No obvious same-chain ticker clones with a different contract.`,
      ),
    );
  }

  const security = await settled(goplusSecurity(chain, pair.base.address));
  if (!security) {
    checks.push(
      check(
        "goplus",
        "Tax / mint / blacklist / owner",
        "info",
        `No GoPlus coverage for ${CHAINS[chain].label}. Read the explorer yourself before touching it.`,
      ),
    );
  } else {
    goplus = {
      honeypot: security.honeypot,
      cannotBuy: security.cannotBuy,
      buyTax: security.buyTax,
      sellTax: security.sellTax,
      mintable: security.mintable,
      blacklist: security.blacklist,
      hiddenOwner: security.hiddenOwner,
      ownerRenounced: security.ownerRenounced,
      openSource: security.openSource,
      holderCount: security.holderCount,
    };
    holders = security.holders;
    top10Percent = security.top10Percent;

    checks.push(
      check(
        "honeypot",
        "Honeypot / cannot buy",
        security.honeypot || security.cannotBuy ? "fail" : "pass",
        security.honeypot || security.cannotBuy
          ? "GoPlus flags this as unbuyable or a honeypot. Skip."
          : "GoPlus does not flag a honeypot. Still not a guarantee.",
      ),
    );
    const tax = Math.max(security.buyTax ?? 0, security.sellTax ?? 0);
    const taxCopy =
      security.buyTax == null && security.sellTax == null
        ? "GoPlus did not report a buy/sell tax. Still verify in Wallet."
        : `Buy tax ${security.buyTax ?? 0}% · sell tax ${security.sellTax ?? 0}%.`;
    checks.push(
      check(
        "tax",
        "Buy / sell tax",
        tax > 10 ? "fail" : tax > 5 ? "warn" : "pass",
        taxCopy,
      ),
    );
    checks.push(
      check(
        "mint",
        "Mint authority",
        security.mintable ? "fail" : "pass",
        security.mintable
          ? "Supply can still be minted. That is a default no."
          : "Mint not flagged.",
      ),
    );
    checks.push(
      check(
        "blacklist",
        "Blacklist / hidden owner",
        security.blacklist || security.hiddenOwner ? "fail" : "pass",
        `Blacklist ${security.blacklist ? "yes" : "no"} · hidden owner ${security.hiddenOwner ? "yes" : "no"} · owner ${security.ownerRenounced ? "renounced/none" : "present"}.`,
      ),
    );
    checks.push(
      check(
        "holders",
        "Top holders",
        (security.top10Percent ?? 0) >= 50 ? "warn" : "pass",
        security.holderCount
          ? `${security.holderCount.toLocaleString()} holders. Top wallets (ex-burn) ≈ ${(security.top10Percent ?? 0).toFixed(1)}%. If 3 wallets own most of it, pass.`
          : "Holder count unavailable.",
      ),
    );
  }

  checks.push(
    check(
      "liq",
      "Liquidity vs your clip",
      pair.liquidityUsd < 30_000 ? "fail" : pair.liquidityUsd < 50_000 ? "warn" : "pass",
      pair.impactFor1k != null
        ? `Liquidity ${Math.round(pair.liquidityUsd).toLocaleString()} USD. A $1k clip is ~${pair.impactFor1k.toFixed(1)}% of the book.`
        : "No liquidity number.",
    ),
  );

  checks.push(
    check(
      "quote",
      "Quote pair",
      ["WETH", "ETH", "USDG", "USDC", "SOL", "WSOL"].includes(pair.quote.symbol.toUpperCase())
        ? "pass"
        : "warn",
      `Quoted in ${pair.quote.symbol}. Prefer WETH or USDG on Robinhood Chain.`,
    ),
  );

  checks.push(
    check(
      "wallet",
      "Wallet risk labels",
      "info",
      "In Robinhood Wallet: Spam / Warning / Suspicious = default no. Masters cannot read the in-app label. Check it before you swap.",
    ),
  );

  checks.push(
    check(
      "boost",
      "Paid trending",
      pair.boosted ? "warn" : "pass",
      pair.boosted
        ? "This token is boosted on DexScreener. Trending is not organic flow."
        : "No active DexScreener boost on the latest feed.",
    ),
  );

  return {
    pair: scorePair(pair),
    query,
    chain,
    clones,
    checks,
    goplus,
    holders,
    top10Percent,
    generatedAt: new Date().toISOString(),
  };
}
