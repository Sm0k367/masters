import { CHAIN_ORDER } from "@/lib/chains";
import { runDiligence } from "@/lib/diligence";
import type { ChainKey } from "@/lib/types";

export const dynamic = "force-dynamic";

function isChain(value: unknown): value is ChainKey {
  return typeof value === "string" && (CHAIN_ORDER as string[]).includes(value);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { q?: string; chain?: string };
  const q = body.q?.trim() ?? "";
  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });
  const chain = isChain(body.chain) ? body.chain : undefined;
  try {
    const report = await runDiligence(q, chain);
    return Response.json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Diligence failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
