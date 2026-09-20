import { cached, fetchJsonRetry, settled } from "@/lib/http";
import type { MajorQuote } from "@/lib/types";

const IDS: { id: string; symbol: string; name: string }[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
];

export async function fetchMajors(): Promise<MajorQuote[]> {
  return cached("coingecko:majors", 30_000, async () => {
    const ids = IDS.map((item) => item.id).join(",");
    const body = await settled(
      fetchJsonRetry<Record<string, { usd?: number; usd_24h_change?: number }>>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      ),
    );
    if (!body) return [];
    return IDS.flatMap((item) => {
      const row = body[item.id];
      if (!row?.usd) return [];
      return [
        {
          id: item.id,
          symbol: item.symbol,
          name: item.name,
          price: row.usd,
          change24h: row.usd_24h_change ?? 0,
        },
      ];
    });
  });
}
