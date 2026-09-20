import { runDesk } from "@/lib/agents";
import { CHAIN_ORDER } from "@/lib/chains";
import { resolveToken } from "@/lib/markets";
import type { ChainKey } from "@/lib/types";

export const dynamic = "force-dynamic";

function isChain(value: unknown): value is ChainKey {
  return typeof value === "string" && (CHAIN_ORDER as string[]).includes(value);
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    q?: string;
    chain?: string;
    llm?: boolean;
  };
  const q = body.q?.trim() ?? "";
  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });
  const chain = isChain(body.chain) ? body.chain : undefined;
  try {
    const pair = await resolveToken(q, chain);
    if (!pair) {
      return Response.json({ error: "Token not found" }, { status: 404 });
    }
    const report = await runDesk(pair, { llm: body.llm !== false });
    return Response.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Desk failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
