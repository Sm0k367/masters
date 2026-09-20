import { CHAIN_ORDER } from "@/lib/chains";
import { runDiligence } from "@/lib/diligence";
import type { ChainKey } from "@/lib/types";

export const dynamic = "force-dynamic";

function isChain(value: unknown): value is ChainKey {
  return typeof value === "string" && (CHAIN_ORDER as string[]).includes(value);
}

async function run(q: string, chain?: ChainKey) {
  try {
    return Response.json(await runDiligence(q, chain));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Diligence failed";
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });
  const chainParam = url.searchParams.get("chain");
  const chain = isChain(chainParam) ? chainParam : undefined;
  return run(q, chain);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { q?: string; chain?: string };
  const q = body.q?.trim() ?? "";
  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });
  const chain = isChain(body.chain) ? body.chain : undefined;
  return run(q, chain);
}
