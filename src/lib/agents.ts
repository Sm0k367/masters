import { classHint } from "@/lib/classify";
import { formatAge, formatPct, formatUsd } from "@/lib/format";
import { verdictLabel } from "@/lib/score";
import type { AgentId, AgentNote, DeskReport, ScoredPair, Verdict } from "@/lib/types";
import { writeBriefing } from "@/lib/llm";

function note(
  id: AgentId,
  name: string,
  stance: Verdict,
  confidence: number,
  headline: string,
  body: string,
): AgentNote {
  return { id, name, headline, body, stance, confidence };
}

function scout(pair: ScoredPair): AgentNote {
  const age = formatAge(pair.ageMs);
  const minutes = pair.ageMs != null ? pair.ageMs / 60_000 : null;
  if (minutes != null && minutes < 180) {
    return note(
      "scout",
      "Scout",
      "lottery",
      78,
      `${pair.base.symbol} is ${age} old on ${pair.dexLabel}.`,
      `Brand-new pool. This is the launch window, not a market. Confirm the contract, then assume the average outcome is zero. Quote ${pair.quote.symbol}.`,
    );
  }
  if (pair.tokenClass === "infra" || pair.tokenClass === "tokenized_stock") {
    return note(
      "scout",
      "Scout",
      "core",
      82,
      `${pair.base.symbol} is a known ${pair.tokenClass.replaceAll("_", " ")} name.`,
      classHint(pair.tokenClass),
    );
  }
  return note(
    "scout",
    "Scout",
    pair.verdict,
    70,
    `${pair.base.symbol} is ${age} on ${pair.chainLabel}.`,
    `${classHint(pair.tokenClass)} DEX ${pair.dexLabel}.`,
  );
}

function tape(pair: ScoredPair): AgentNote {
  const buys = pair.txns.h1.buys;
  const sells = pair.txns.h1.sells;
  const pressure = pair.buyPressureH1;
  const makers = pair.uniqueMakersH1;
  const parts = [
    `H1 ${buys} buys / ${sells} sells.`,
    `24h volume ${formatUsd(pair.volume.h24)}, 24h ${formatPct(pair.change.h24)}.`,
  ];
  if (makers != null) parts.push(`${makers} unique makers in the last hour.`);
  let stance: Verdict = "watch";
  if (pressure != null && pressure <= 0.38) stance = "skip";
  else if ((pair.change.h24 ?? 0) >= 500) stance = "lottery";
  else if (pressure != null && pressure >= 0.6 && pair.volume.h24 >= 500_000) stance = "size";
  return note(
    "tape",
    "Tape",
    stance,
    74,
    pressure != null
      ? `Tape is ${Math.round(pressure * 100)}% buys over the last hour.`
      : "Not enough prints to trust the tape.",
    parts.join(" "),
  );
}

function depth(pair: ScoredPair): AgentNote {
  const impact = pair.impactFor1k;
  if (pair.liquidityUsd < 30_000) {
    return note(
      "depth",
      "Depth",
      "skip",
      90,
      `Book is ${formatUsd(pair.liquidityUsd)} — dust.`,
      "A few thousand dollars of volume can print +10,000% and you still cannot exit at that price. Size so you can leave, or do not enter.",
    );
  }
  if (impact != null && impact > 5) {
    return note(
      "depth",
      "Depth",
      "lottery",
      80,
      `A $1k clip is about ${impact.toFixed(1)}% of the pool.`,
      `Liquidity ${formatUsd(pair.liquidityUsd)}. Your buy is part of the candle. Cap the ticket or skip.`,
    );
  }
  return note(
    "depth",
    "Depth",
    pair.liquidityUsd >= 100_000 ? "size" : "watch",
    76,
    `Liquidity ${formatUsd(pair.liquidityUsd)} / FDV ${formatUsd(pair.fdvUsd)}.`,
    "Thick enough for a small clip if the rest of the desk agrees. Still not a place to dump size.",
  );
}

function risk(pair: ScoredPair): AgentNote {
  const heavy = pair.flags.filter((flag) => flag !== "clean");
  if (heavy.includes("honeypot") || heavy.includes("spam")) {
    return note(
      "risk",
      "Risk",
      "skip",
      92,
      "Hard no from risk.",
      heavy.join(", ") + ". " + pair.reasons.slice(0, 2).join(" "),
    );
  }
  if (heavy.includes("paid_trend") || heavy.includes("clone") || heavy.includes("suspicious")) {
    return note(
      "risk",
      "Risk",
      "skip",
      84,
      "Risk wants you to pass or shrink to lottery size.",
      pair.reasons.slice(0, 3).join(" "),
    );
  }
  if (heavy.includes("thin_book") || heavy.includes("warning")) {
    return note(
      "risk",
      "Risk",
      "lottery",
      72,
      "Warning labels on. Default is no unless the clip is throwaway.",
      pair.reasons.slice(0, 3).join(" "),
    );
  }
  return note(
    "risk",
    "Risk",
    pair.verdict,
    68,
    "No automatic kill-switch from the public tape.",
    "Still run the rug checker: contract kill switches, simulated buy/sell, LP lock, clones, top holders, Wallet Spam/Warning/Suspicious.",
  );
}

function narrative(pair: ScoredPair): AgentNote {
  return note(
    "narrative",
    "Narrative",
    pair.tokenClass === "launch" ? "lottery" : pair.verdict,
    65,
    classHint(pair.tokenClass),
    pair.tokenClass === "tokenized_stock"
      ? `${pair.base.symbol} is a tokenized name on ${pair.chainLabel}. It can have real volume and still gap like a meme when crypto books thin out.`
      : `Cat, AI, Hood, Uranus, FOMO — the names cycle every day. Ticker quality is not an edge. Liquidity, age, and unique makers are.`,
  );
}

function chiefOf(pair: ScoredPair, agents: AgentNote[]): AgentNote {
  const skips = agents.filter((agent) => agent.stance === "skip").length;
  let stance = pair.verdict;
  if (skips >= 2) stance = "skip";
  const sizeHint =
    stance === "skip"
      ? "Size: $0."
      : stance === "lottery"
        ? "Size: throwaway clip only. Partial out on the first spike."
        : stance === "watch"
          ? "Size: none until volume holds for more than one session."
          : stance === "size"
            ? "Size: small, defined exit, never the hot wallet with savings."
            : "Size: core-tape clip, still not a stock.";
  return note(
    "chief",
    "Desk chief",
    stance,
    Math.min(95, 60 + pair.score / 4),
    `${pair.base.symbol} → ${verdictLabel(stance)}. Score ${pair.score}/100.`,
    `${sizeHint} ${pair.reasons[0] ?? ""} Not financial advice.`,
  );
}

export async function runDesk(
  pair: ScoredPair,
  options: { llm?: boolean } = {},
): Promise<DeskReport> {
  const agents = [scout(pair), tape(pair), depth(pair), risk(pair), narrative(pair)];
  const chief = chiefOf(pair, agents);
  const all = [...agents, chief];
  const llm = options.llm !== false ? await writeBriefing(pair, all) : { text: null, model: null };
  const briefing =
    llm.text ??
    [
      `${pair.base.symbol} on ${pair.chainLabel} is a ${verdictLabel(chief.stance).toLowerCase()} from the desk.`,
      chief.body,
      `Age ${formatAge(pair.ageMs)}, liq ${formatUsd(pair.liquidityUsd)}, 24h vol ${formatUsd(pair.volume.h24)}.`,
      "Most new Wallet-trending tokens do not hold the print.",
    ].join(" ");

  return {
    pair,
    agents: all,
    chief,
    briefing,
    llmUsed: Boolean(llm.text && llm.model !== "desk-rules"),
    llmModel: llm.model,
    generatedAt: new Date().toISOString(),
  };
}
