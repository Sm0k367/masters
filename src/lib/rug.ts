import { ageMinutes } from "@/lib/format";
import type { GoPlusReport } from "@/lib/goplus";
import type { HoneypotSim } from "@/lib/honeypot";
import type { SolanaRug } from "@/lib/rugcheck";
import type {
  CheckCategory,
  CheckStatus,
  DiligenceCheck,
  KillSwitch,
  RugMeter,
  ScoredPair,
} from "@/lib/types";

function check(
  id: string,
  category: CheckCategory,
  label: string,
  status: CheckStatus,
  detail: string,
): DiligenceCheck {
  return { id, category, label, status, detail };
}

export function buildRugChecks(input: {
  pair: ScoredPair;
  goplus: GoPlusReport | null;
  sim: HoneypotSim | null;
  solana: SolanaRug | null;
  cloneCount: number;
  query: string;
}): DiligenceCheck[] {
  const { pair, goplus, sim, solana, cloneCount, query } = input;
  const checks: DiligenceCheck[] = [];
  const minutes = ageMinutes(pair.ageMs);
  const pastedAddress =
    query.trim().startsWith("0x") || (!query.includes(" ") && query.trim().length >= 32);

  const simClears =
    Boolean(sim?.available) &&
    sim?.simulationSuccess === true &&
    sim?.isHoneypot === false &&
    (sim.buyTax ?? 0) < 5 &&
    (sim.sellTax ?? 0) < 5 &&
    (goplus?.holderCount ?? 0) >= 10_000;

  function contractFail(flagged: boolean): CheckStatus {
    if (!flagged) return "pass";
    if (sim?.isHoneypot) return "fail";
    if (simClears) return "warn";
    return "fail";
  }

  checks.push(
    check(
      "resolve",
      "tape",
      "Resolved the actual contract",
      "pass",
      `${pair.base.name} (${pair.base.symbol}) on ${pair.chainLabel}. ${pair.base.address}`,
    ),
  );

  if (cloneCount > 0) {
    checks.push(
      check(
        "clone",
        "clones",
        "Clone ticker",
        pastedAddress ? "warn" : cloneCount >= 3 ? "fail" : "warn",
        pastedAddress
          ? `${cloneCount} other ${pair.base.symbol} contract(s) on ${pair.chainLabel}. You pasted the address — still confirm it is the pool you meant.`
          : `${cloneCount} other ${pair.base.symbol} contract(s) on ${pair.chainLabel}. Confirm the address, not the ticker.`,
      ),
    );
  } else {
    checks.push(
      check(
        "clone",
        "clones",
        "Clone ticker",
        "pass",
        "No obvious same-chain ticker clones with a different contract.",
      ),
    );
  }

  if (sim?.available) {
    const tax = Math.max(sim.buyTax ?? 0, sim.sellTax ?? 0);
    checks.push(
      check(
        "sim-honey",
        "honeypot",
        "Live buy/sell simulation",
        sim.isHoneypot || sim.simulationSuccess === false ? "fail" : "pass",
        sim.isHoneypot
          ? "Honeypot.is simulated a buy that cannot sell. Skip."
          : sim.simulationSuccess === false
            ? "Simulation failed. Treat as unsellable until you prove otherwise."
            : `Simulated round-trip. Buy tax ${sim.buyTax ?? 0}% · sell tax ${sim.sellTax ?? 0}% · risk ${sim.risk ?? "n/a"}.`,
      ),
    );
    if (tax > 0) {
      checks.push(
        check(
          "sim-tax",
          "honeypot",
          "Simulated tax",
          tax >= 10 ? "fail" : tax >= 5 ? "warn" : "pass",
          `Honeypot.is buy ${sim.buyTax ?? 0}% / sell ${sim.sellTax ?? 0}%. Hidden tax is how most honeypots print.`,
        ),
      );
    }
    if (sim.holderFailedPct != null && sim.holderFailedPct >= 5) {
      checks.push(
        check(
          "sim-holders",
          "honeypot",
          "Holder sell simulation",
          sim.holderFailedPct >= 20 ? "fail" : "warn",
          `${sim.holderFailedPct.toFixed(1)}% of sampled holders fail a sell sim. Classic honeypot fingerprint.`,
        ),
      );
    }
  } else if (pair.chain === "eth" || pair.chain === "bsc" || pair.chain === "base" || pair.chain === "arbitrum") {
    checks.push(
      check(
        "sim-honey",
        "honeypot",
        "Live buy/sell simulation",
        "info",
        "Honeypot.is did not return a sim. Do not assume it can sell.",
      ),
    );
  }

  if (!goplus) {
    checks.push(
      check(
        "goplus",
        "contract",
        "Contract scanner",
        "info",
        `No GoPlus coverage on ${pair.chainLabel}. Read the explorer yourself. Default is no.`,
      ),
    );
  } else {
    checks.push(
      check(
        "honeypot",
        "honeypot",
        "Honeypot / cannot buy",
        goplus.honeypot || goplus.cannotBuy ? "fail" : "pass",
        goplus.honeypot || goplus.cannotBuy
          ? "GoPlus flags this as unbuyable or a honeypot. Skip."
          : "GoPlus does not flag a honeypot. That is not a guarantee you can sell.",
      ),
    );
    const tax = Math.max(goplus.buyTax ?? 0, goplus.sellTax ?? 0, goplus.transferTax ?? 0);
    checks.push(
      check(
        "tax",
        "honeypot",
        "Buy / sell / transfer tax",
        tax >= 10 ? "fail" : tax >= 5 ? "warn" : "pass",
        goplus.buyTax == null && goplus.sellTax == null
          ? "GoPlus did not report a tax. Still verify the Wallet quote."
          : `Buy ${goplus.buyTax ?? 0}% · sell ${goplus.sellTax ?? 0}% · transfer ${goplus.transferTax ?? 0}%.`,
      ),
    );
    checks.push(
      check(
        "mint",
        "contract",
        "Mint authority",
        goplus.mintable ? "fail" : "pass",
        goplus.mintable
          ? "Supply can still be minted. That is a default no — they can dilute you to zero."
          : "Mint not flagged.",
      ),
    );
    if (goplus.chainKind === "solana" || goplus.freezeable) {
      checks.push(
        check(
          "freeze",
          "contract",
          "Freeze authority",
          goplus.freezeable ? "fail" : "pass",
          goplus.freezeable
            ? "Freeze is live. They can halt your wallet. Skip."
            : "Freeze authority not flagged.",
        ),
      );
    }
    checks.push(
      check(
        "blacklist",
        "contract",
        "Blacklist / whitelist",
        contractFail(goplus.blacklist || goplus.whitelist),
        `Blacklist ${goplus.blacklist ? "yes" : "no"} · whitelist ${goplus.whitelist ? "yes" : "no"}. Either function can trap sellers.${simClears ? " Honeypot.is still round-tripped this — treating as a noisy flag, not a skip by itself." : ""}`,
      ),
    );
    checks.push(
      check(
        "owner",
        "contract",
        "Hidden owner / take-back",
        goplus.hiddenOwner || goplus.canTakeBackOwnership ? "fail" : goplus.ownerRenounced ? "pass" : "warn",
        `Hidden owner ${goplus.hiddenOwner ? "yes" : "no"} · take-back ${goplus.canTakeBackOwnership ? "yes" : "no"} · owner ${goplus.ownerRenounced ? "renounced/none" : "still present"}.`,
      ),
    );
    checks.push(
      check(
        "pause",
        "contract",
        "Pause / cooldown / selfdestruct",
        contractFail(goplus.transferPausable || goplus.selfdestruct),
        `Pausable ${goplus.transferPausable ? "yes" : "no"} · cooldown ${goplus.tradingCooldown ? "yes" : "no"} · selfdestruct ${goplus.selfdestruct ? "yes" : "no"}.${simClears ? " Live sim sold — not treating this as a hard honeypot." : ""}`,
      ),
    );
    checks.push(
      check(
        "proxy",
        "contract",
        "Proxy / slippage trap",
        goplus.personalSlippageModifiable || goplus.slippageModifiable ? "fail" : goplus.isProxy ? "warn" : "pass",
        `Proxy ${goplus.isProxy ? "yes" : "no"} · tax/slippage modifiable ${goplus.slippageModifiable || goplus.personalSlippageModifiable ? "yes" : "no"}. A proxy can become a different contract tomorrow.`,
      ),
    );
    checks.push(
      check(
        "source",
        "contract",
        "Verified source",
        goplus.openSource === false ? "fail" : goplus.openSource ? "pass" : "info",
        goplus.openSource === false
          ? "Unverified bytecode. You are buying a black box."
          : goplus.openSource
            ? "Source is marked open. Still read it — verified ≠ safe."
            : "No source flag from GoPlus.",
      ),
    );
    if (goplus.honeypotSameCreator) {
      checks.push(
        check(
          "serial",
          "honeypot",
          "Same creator, prior honeypot",
          "fail",
          "GoPlus says this deployer already shipped a honeypot. Serial rug pattern.",
        ),
      );
    }
    if (goplus.cannotSellAll) {
      checks.push(
        check(
          "sell-all",
          "honeypot",
          "Cannot sell 100%",
          "fail",
          "Contract blocks selling the full bag. Classic trap.",
        ),
      );
    }
    if (goplus.ownerChangeBalance) {
      checks.push(
        check(
          "balance",
          "contract",
          "Owner can rewrite balances",
          "fail",
          "Owner can change token balances. That is not a market.",
        ),
      );
    }
    if (goplus.antiWhale || goplus.antiWhaleModifiable) {
      checks.push(
        check(
          "whale",
          "contract",
          "Anti-whale / max tx",
          goplus.antiWhaleModifiable ? "warn" : "info",
          "Max-tx / anti-whale is on. Fine for some tokens, a stealth honeypot when the owner can change it.",
        ),
      );
    }
    if (goplus.metadataMutable) {
      checks.push(
        check(
          "metadata",
          "solana",
          "Mutable metadata",
          "warn",
          "Name/image can still be changed. Impersonation vector after you buy.",
        ),
      );
    }
    if (goplus.closable) {
      checks.push(
        check(
          "close",
          "solana",
          "Closable mint",
          "fail",
          "Mint is closable. They can shut the token.",
        ),
      );
    }

    const creator = goplus.creatorPercent ?? 0;
    const ownerPct = goplus.ownerPercent ?? 0;
    const top = goplus.top10Percent ?? 0;
    checks.push(
      check(
        "holders",
        "holders",
        "Holder concentration",
        creator >= 15 || ownerPct >= 15 || top >= 70 ? "fail" : top >= 45 ? "warn" : "pass",
        [
          goplus.holderCount ? `${goplus.holderCount.toLocaleString()} holders` : "Holder count n/a",
          `top wallets ex-burn ≈ ${top.toFixed(1)}%`,
          `creator ${creator.toFixed(2)}%`,
          `owner ${ownerPct.toFixed(2)}%`,
        ].join(" · ") + ". If 3 wallets own it, you are exit liquidity.",
      ),
    );

    if (goplus.lpHolders.length) {
      const locked = goplus.lpLockedPct ?? 0;
      const unlocked = 100 - locked;
      const young = minutes != null && minutes < 180;
      const thin = pair.liquidityUsd < 50_000;
      const status: CheckStatus =
        (young && unlocked >= 50) || (thin && locked < 10)
          ? "fail"
          : locked < 50
            ? "warn"
            : "pass";
      checks.push(
        check(
          "lp",
          "liquidity",
          "LP lock / burn",
          status,
          `Locked/burned ≈ ${locked.toFixed(0)}% of LP (${(goplus.lpBurnedPct ?? 0).toFixed(0)}% burned). Unlocked UniV3 NFTs can still be withdrawn. On a young thin book that is the rug button.`,
        ),
      );
    }
  }

  if (solana?.available) {
    checks.push(
      check(
        "rugcheck",
        "solana",
        "RugCheck.xyz",
        solana.rugged || solana.mintAuthority || solana.freezeAuthority
          ? "fail"
          : (solana.riskScore ?? 0) >= 40 || solana.mutableMetadata
            ? "warn"
            : "pass",
        solana.rugged
          ? "RugCheck marks this mint rugged."
          : `Risk score ${solana.riskScore ?? "n/a"} · mint auth ${solana.mintAuthority ? "live" : "none"} · freeze ${solana.freezeAuthority ? "live" : "none"} · metadata ${solana.mutableMetadata ? "mutable" : "frozen"}.`,
      ),
    );
    for (const risk of solana.risks.slice(0, 6)) {
      const level = risk.level.toLowerCase();
      const status: CheckStatus =
        level === "danger" || level === "critical" || level === "rug"
          ? "fail"
          : level === "warn" || level === "warning"
            ? "warn"
            : "info";
      checks.push(
        check(
          `rc-${risk.name.toLowerCase().replace(/\s+/g, "-").slice(0, 24)}`,
          "solana",
          risk.name,
          status,
          risk.description || risk.level,
        ),
      );
    }
  }

  checks.push(
    check(
      "liq",
      "liquidity",
      "Liquidity vs a $1k clip",
      pair.liquidityUsd < 15_000 ? "fail" : pair.liquidityUsd < 50_000 ? "warn" : "pass",
      pair.impactFor1k != null
        ? `Book ${Math.round(pair.liquidityUsd).toLocaleString()} USD. A $1k clip is ~${pair.impactFor1k.toFixed(1)}% of the pool. Thin books are not exits.`
        : `Liquidity ${Math.round(pair.liquidityUsd).toLocaleString()} USD.`,
    ),
  );

  const quote = pair.quote.symbol.toUpperCase();
  const preferred = ["WETH", "ETH", "USDG", "USDC", "USDT", "SOL", "WSOL", "WBNB", "BNB"].includes(quote);
  checks.push(
    check(
      "quote",
      "liquidity",
      "Quote asset",
      preferred ? "pass" : "warn",
      `Quoted in ${pair.quote.symbol}. Prefer WETH/USDG on Robinhood Chain, SOL/USDC on Solana.`,
    ),
  );

  if (minutes != null && minutes < 30) {
    checks.push(
      check(
        "age",
        "tape",
        "Pool age",
        "fail",
        `Pool is ${Math.max(1, Math.round(minutes))}m old. This is a snipe, not a market. Most die here.`,
      ),
    );
  } else if (minutes != null && minutes < 48 * 60) {
    checks.push(
      check(
        "age",
        "tape",
        "Pool age",
        "warn",
        `Under 48h (${(minutes / 60).toFixed(1)}h). Still a lottery ticket even if the contract looks clean.`,
      ),
    );
  } else {
    checks.push(
      check(
        "age",
        "tape",
        "Pool age",
        "pass",
        minutes != null ? `Survived ${(minutes / 60 / 24).toFixed(1)} days. Rarer. Not safe.` : "Age unknown.",
      ),
    );
  }

  const makers = pair.uniqueMakersH1;
  if (makers != null && makers < 8 && pair.volume.h1 > 20_000) {
    checks.push(
      check(
        "wash",
        "tape",
        "Unique makers vs volume",
        "fail",
        `H1 volume ${Math.round(pair.volume.h1).toLocaleString()} with ${makers} unique wallets. Looped tape.`,
      ),
    );
  } else if (makers != null) {
    checks.push(
      check(
        "wash",
        "tape",
        "Unique makers vs volume",
        makers >= 40 ? "pass" : "info",
        `${makers} unique makers in the last hour.`,
      ),
    );
  }

  const pressure = pair.buyPressureH1;
  if (pressure != null && pressure <= 0.35) {
    checks.push(
      check(
        "tape",
        "tape",
        "H1 buy/sell",
        "warn",
        `Only ${Math.round(pressure * 100)}% of last-hour txns are buys. Chase is late.`,
      ),
    );
  }

  const dump = pair.change.h24 ?? 0;
  if (dump <= -70 && (minutes == null || minutes < 24 * 60)) {
    checks.push(
      check(
        "dump",
        "tape",
        "Already dumped",
        "fail",
        `${dump.toFixed(0)}% in 24h on a young pool. You are catching a knife.`,
      ),
    );
  } else if (dump >= 500) {
    checks.push(
      check(
        "pump",
        "tape",
        "Vertical print",
        "warn",
        `${Math.round(dump)}% in 24h. That candle is usually already done.`,
      ),
    );
  }

  checks.push(
    check(
      "boost",
      "tape",
      "Paid trending",
      pair.boosted ? "warn" : "pass",
      pair.boosted
        ? "Boosted on DexScreener. Trending is an ad, not organic flow."
        : "No active DexScreener boost on the latest feed.",
    ),
  );

  checks.push(
    check(
      "wallet",
      "tape",
      "Robinhood Wallet labels",
      "info",
      "In Robinhood Wallet: Spam / Warning / Suspicious = default no. Masters cannot read the in-app label. Check it before you swap.",
    ),
  );

  return checks;
}

export function buildKillSwitches(
  goplus: GoPlusReport | null,
  sim: HoneypotSim | null,
  solana: SolanaRug | null,
): KillSwitch[] {
  const honey = Boolean(sim?.isHoneypot || goplus?.honeypot || goplus?.cannotBuy);
  const mint = Boolean(goplus?.mintable || solana?.mintAuthority);
  const freeze = Boolean(goplus?.freezeable || solana?.freezeAuthority);
  const pause = Boolean(goplus?.transferPausable || goplus?.selfdestruct);
  const list = Boolean(goplus?.blacklist || goplus?.whitelist);
  const hidden = Boolean(goplus?.hiddenOwner || goplus?.canTakeBackOwnership);
  const proxy = Boolean(goplus?.isProxy || goplus?.slippageModifiable || goplus?.personalSlippageModifiable);
  const source = goplus?.openSource === false;
  return [
    { id: "honey", label: "Honeypot", status: honey ? "fail" : sim || goplus ? "pass" : "info" },
    { id: "mint", label: "Mint", status: mint ? "fail" : goplus || solana ? "pass" : "info" },
    { id: "freeze", label: "Freeze", status: freeze ? "fail" : "pass" },
    { id: "pause", label: "Pause / kill", status: pause ? "fail" : "pass" },
    { id: "list", label: "Blacklist", status: list ? "fail" : "pass" },
    { id: "owner", label: "Hidden owner", status: hidden ? "fail" : goplus?.ownerRenounced ? "pass" : "warn" },
    { id: "proxy", label: "Proxy / tax trap", status: proxy ? (goplus?.personalSlippageModifiable ? "fail" : "warn") : "pass" },
    { id: "source", label: "Unverified", status: source ? "fail" : goplus?.openSource ? "pass" : "info" },
  ];
}

export function buildRugMeter(checks: DiligenceCheck[]): RugMeter {
  const hardFails = checks.filter((item) => item.status === "fail").length;
  const warns = checks.filter((item) => item.status === "warn").length;
  let score = 78 - hardFails * 14 - warns * 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let verdict: RugMeter["verdict"];
  if (hardFails > 0 || score < 32) verdict = "hard_no";
  else if (warns >= 3 || score < 55) verdict = "caution";
  else if (score < 72) verdict = "watch";
  else verdict = "clearer";

  const headline =
    verdict === "hard_no"
      ? hardFails === 1
        ? "One hard fail. Default is no."
        : `${hardFails} hard fails. Do not buy this.`
      : verdict === "caution"
        ? "Contract is not a clean skip, but it is not a market either."
        : verdict === "watch"
          ? "No automatic kill — still size it like a lottery ticket."
          : "Scanner is quieter than most trench names. That is not safety.";

  return { score, verdict, headline, hardFails, warns };
}

export function rugVerdictLabel(verdict: RugMeter["verdict"]): string {
  switch (verdict) {
    case "hard_no":
      return "HARD NO";
    case "caution":
      return "CAUTION";
    case "watch":
      return "WATCH";
    case "clearer":
      return "CLEARER";
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}
