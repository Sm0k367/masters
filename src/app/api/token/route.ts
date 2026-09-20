import { CHAIN_ORDER } from "@/lib/chains";
import { resolveToken } from "@/lib/markets";
import type { ChainKey } from "@/lib/types";

export const dynamic = "force-dynamic";

function isChain(value: string | null): value is ChainKey {
  return Boolean(value && (CHAIN_ORDER as string[]).includes(value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const chainParam = url.searchParams.get("chain");
  const chain = isChain(chainParam) ? chainParam : undefined;
  if (!q.trim()) {
    return Response.json({ error: "Missing q" }, { status: 400 });
  }
  try {
    const pair = await resolveToken(q, chain);
    if (!pair) {
      return Response.json({ error: "Token not found", pair: null }, { status: 404 });
    }
    return Response.json({ pair });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lookup failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
