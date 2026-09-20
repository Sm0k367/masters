import { CHAIN_ORDER } from "@/lib/chains";
import { getScan } from "@/lib/markets";
import type { ChainKey } from "@/lib/types";

export const dynamic = "force-dynamic";

function isChain(value: string | null): value is ChainKey {
  return Boolean(value && (CHAIN_ORDER as string[]).includes(value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const chainParam = url.searchParams.get("chain") ?? "robinhood";
  const chain: ChainKey = isChain(chainParam) ? chainParam : "robinhood";
  try {
    const scan = await getScan(chain);
    return Response.json(scan);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
