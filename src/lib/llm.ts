import type { AgentNote, ScoredPair } from "@/lib/types";
import { classHint } from "@/lib/classify";
import { formatAge, formatPct, formatUsd } from "@/lib/format";
import { verdictLabel } from "@/lib/score";

type LlmResult = { text: string | null; model: string | null };

function fallbackBrief(pair: ScoredPair, agents: AgentNote[]): string {
  const chief = agents.find((agent) => agent.id === "chief");
  return [
    `${pair.base.symbol}/${pair.quote.symbol} on ${pair.chainLabel} — ${verdictLabel(pair.verdict)}.`,
    classHint(pair.tokenClass),
    `Age ${formatAge(pair.ageMs)}, liquidity ${formatUsd(pair.liquidityUsd)}, 24h volume ${formatUsd(pair.volume.h24)}, 24h ${formatPct(pair.change.h24)}.`,
    chief?.body ?? "",
    "Do not treat a 16-hour +100,000% print as a plan. Verify the contract. Use Wallet risk labels. Only money you can lose.",
  ]
    .filter(Boolean)
    .join(" ");
}

function usable(text: string | undefined): text is string {
  if (!text) return false;
  const lower = text.toLowerCase();
  if (lower.includes("not enough credits") || lower.includes("top up")) return false;
  if (lower.includes("rate limit") || lower.includes("quota")) return false;
  return text.trim().length >= 60;
}

async function completeChat(messages: { role: "system" | "user"; content: string }[]): Promise<LlmResult> {
  const base = process.env.FREELLM_BASE_URL?.replace(/\/$/, "");
  const key = process.env.FREELLM_API_KEY;
  const model = process.env.FREELLM_MODEL ?? "auto";

  if (base && key) {
    try {
      const response = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages,
        }),
      });
      if (response.ok) {
        const body = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
          model?: string;
        };
        const text = body.choices?.[0]?.message?.content?.trim();
        if (usable(text)) return { text, model: body.model ?? model };
      }
    } catch (error) {
      console.warn("FreeLLMAPI failed", error);
    }
  }

  try {
    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages,
        seed: 7,
      }),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
        model?: string;
      };
      const text = body.choices?.[0]?.message?.content?.trim();
      if (usable(text)) return { text, model: body.model ?? "pollinations" };
    }
  } catch (error) {
    console.warn("Pollinations failed", error);
  }

  return { text: null, model: null };
}

export async function writeBriefing(
  pair: ScoredPair,
  agents: AgentNote[],
): Promise<LlmResult> {
  const payload = {
    token: pair.base.symbol,
    name: pair.base.name,
    chain: pair.chainLabel,
    address: pair.base.address,
    age: formatAge(pair.ageMs),
    liquidity: pair.liquidityUsd,
    volume24h: pair.volume.h24,
    change24h: pair.change.h24,
    verdict: pair.verdict,
    tokenClass: pair.tokenClass,
    flags: pair.flags,
    reasons: pair.reasons,
    agents: agents.map((agent) => ({
      id: agent.id,
      stance: agent.stance,
      headline: agent.headline,
    })),
  };

  const result = await completeChat([
    {
      role: "system",
      content:
        "You are the desk chief of Masters, a crypto trench terminal. Write 90-140 words. No hype. No 'will profit'. Frame new Robinhood Chain / meme launches as lottery tickets. Tokenized stocks are not share ownership. Say skip/watch/lottery/small-size plainly. End with not financial advice. Do not invent prices or holder stats that are not in the JSON.",
    },
    {
      role: "user",
      content: `Write today's tape note for this token.\n${JSON.stringify(payload)}`,
    },
  ]);

  if (result.text) return result;
  return { text: fallbackBrief(pair, agents), model: "desk-rules" };
}

export async function writeDailyMemo(input: {
  heat: string;
  launches: string[];
  volume: string[];
  stickier: string[];
}): Promise<LlmResult> {
  const result = await completeChat([
    {
      role: "system",
      content:
        "You write a Robinhood Wallet / all-chain daily for a trading desk. Four short buckets: chain heat, sub-48h launches, volume leaders, stickier names. Brutal and specific. No profit promises. Close with not financial advice.",
    },
    {
      role: "user",
      content: JSON.stringify(input),
    },
  ]);
  return result.text ? result : { text: null, model: null };
}
