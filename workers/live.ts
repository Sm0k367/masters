type LiveSymbol = "BTC" | "ETH" | "SOL" | "SPY" | "NVDA";
type LiveAction = "buy" | "sell" | "hold" | "skip";
type LiveVenue = "crypto" | "equity";
type LiveFillStatus = "preview" | "submitted" | "filled" | "rejected";

type LivePosition = {
  symbol: LiveSymbol;
  venue: LiveVenue;
  quantity: number;
  avgCost: number;
  mark: number;
  valueUsd: number;
  pnlPct: number;
};

type LiveFill = {
  id: string;
  at: string;
  symbol: LiveSymbol;
  venue: LiveVenue;
  side: "buy" | "sell";
  notionalUsd: number;
  status: LiveFillStatus;
  brokerId: string | null;
  refId: string | null;
  reason: string;
};

type Snapshot = {
  armed: boolean;
  cash: number;
  buyingPower: number;
  cryptoBuyingPower: number;
  positions: LivePosition[];
  lastTickAt: string | null;
  lastFillAt: string | null;
};

type MajorQuote = { symbol: string; price: number; change24h: number };

type Env = {
  LIVE: KVNamespace;
  LIVE_KEY?: string;
};

const CLIP = 10;
const STOP = -8;
const MAX_DAILY = 30;
const COOLDOWN_MS = 20 * 60 * 1000;
const ACCOUNT = "••••5205";
const BOOK_KEY = "book";
const FILLS_KEY = "fills";
const CRYPTO: LiveSymbol[] = ["BTC", "ETH", "SOL"];

function emptyBook(): Snapshot {
  return {
    armed: true,
    cash: 0,
    buyingPower: 0,
    cryptoBuyingPower: 0,
    positions: [],
    lastTickAt: null,
    lastFillAt: null,
  };
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Snapshot;
  return typeof row.armed === "boolean" && typeof row.buyingPower === "number";
}

function venueOf(symbol: LiveSymbol): LiveVenue {
  switch (symbol) {
    case "BTC":
    case "ETH":
    case "SOL":
      return "crypto";
    case "SPY":
    case "NVDA":
      return "equity";
    default: {
      const _exhaustive: never = symbol;
      return _exhaustive;
    }
  }
}

function dailySpent(fills: LiveFill[], nowIso: string): number {
  const day = nowIso.slice(0, 10);
  return fills
    .filter(
      (fill) =>
        fill.at.slice(0, 10) === day &&
        fill.side === "buy" &&
        (fill.status === "filled" || fill.status === "submitted"),
    )
    .reduce((sum, fill) => sum + fill.notionalUsd, 0);
}

function lastFillAt(fills: LiveFill[]): number | null {
  let latest: number | null = null;
  for (const fill of fills) {
    if (fill.status === "rejected" || fill.status === "preview") continue;
    const ts = Date.parse(fill.at);
    if (!Number.isFinite(ts)) continue;
    if (latest == null || ts > latest) latest = ts;
  }
  return latest;
}

function decide(input: {
  majors: MajorQuote[];
  positions: LivePosition[];
  fills: LiveFill[];
  armed: boolean;
  buyingPower: number;
  cryptoBuyingPower: number;
  now: Date;
}): {
  action: LiveAction;
  symbol: LiveSymbol | null;
  venue: LiveVenue | null;
  notionalUsd: number;
  headline: string;
  body: string;
} {
  const nowIso = input.now.toISOString();
  if (!input.armed) {
    return {
      action: "skip",
      symbol: null,
      venue: null,
      notionalUsd: 0,
      headline: "Kill switch is on.",
      body: "No new clips. Open positions are left alone until you arm the desk again.",
    };
  }

  const open = input.positions.filter((pos) => pos.quantity > 0);
  if (open.length > 0) {
    const pos = open[0];
    if (pos.pnlPct <= STOP) {
      return {
        action: "sell",
        symbol: pos.symbol,
        venue: pos.venue,
        notionalUsd: Math.min(pos.valueUsd, CLIP * 2),
        headline: `Stop: ${pos.symbol} is ${pos.pnlPct.toFixed(1)}% vs cost.`,
        body: `Desk rule is cut at ${STOP}% — sell the live clip.`,
      };
    }
    return {
      action: "hold",
      symbol: pos.symbol,
      venue: pos.venue,
      notionalUsd: 0,
      headline: `Holding ${pos.symbol}. One clip at a time.`,
      body: `Mark ${pos.mark.toFixed(2)} · ${pos.pnlPct.toFixed(1)}% vs cost. No add.`,
    };
  }

  const spent = dailySpent(input.fills, nowIso);
  if (spent >= MAX_DAILY) {
    return {
      action: "skip",
      symbol: null,
      venue: null,
      notionalUsd: 0,
      headline: "Daily notional cap hit.",
      body: `Already ${spent.toFixed(0)} USD in buys today. Cap is $${MAX_DAILY}.`,
    };
  }

  const last = lastFillAt(input.fills);
  if (last != null && input.now.getTime() - last < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - (input.now.getTime() - last)) / 60_000);
    return {
      action: "skip",
      symbol: null,
      venue: null,
      notionalUsd: 0,
      headline: "Cooldown.",
      body: `Last live clip was too recent. ${wait}m left before the next one.`,
    };
  }

  const ranked = CRYPTO.map((symbol) => {
    const row = input.majors.find((item) => item.symbol === symbol);
    return { symbol, change: row?.change24h ?? 0 };
  }).sort((a, b) => b.change - a.change);
  const best = ranked[0];
  const symbol: LiveSymbol = best && best.change >= 0.4 ? best.symbol : "ETH";
  const venue = venueOf(symbol);
  const quote = input.majors.find((item) => item.symbol === symbol);
  const change = quote?.change24h ?? 0;

  if (change <= -5) {
    return {
      action: "skip",
      symbol,
      venue,
      notionalUsd: 0,
      headline: `${symbol} is ${change.toFixed(1)}% on the day — no knife catch.`,
      body: "Automated clips only go into names that are not already dumping.",
    };
  }

  const power = venue === "crypto" ? input.cryptoBuyingPower : input.buyingPower;
  const notional = Math.min(CLIP, Math.floor(power * 100) / 100);
  if (power < 5 || notional < 5) {
    return {
      action: "skip",
      symbol,
      venue,
      notionalUsd: 0,
      headline: "Not enough buying power for a clip.",
      body: `Need at least $5. Buying power is ${power.toFixed(2)}.`,
    };
  }

  return {
    action: "buy",
    symbol,
    venue,
    notionalUsd: notional,
    headline: `Buy $${notional.toFixed(0)} ${symbol} on Robinhood.`,
    body:
      venue === "equity"
        ? `${symbol} cash session is open. Clip $${notional.toFixed(0)}.`
        : `${symbol} is the 24/7 live book. Never PONS/CASHCAT. Clip $${notional.toFixed(0)}.`,
  };
}

async function fetchMajors(): Promise<MajorQuote[]> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true",
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as Record<string, { usd?: number; usd_24h_change?: number }>;
    const map: { id: string; symbol: LiveSymbol }[] = [
      { id: "bitcoin", symbol: "BTC" },
      { id: "ethereum", symbol: "ETH" },
      { id: "solana", symbol: "SOL" },
    ];
    return map.flatMap((item) => {
      const row = body[item.id];
      if (!row?.usd) return [];
      return [{ symbol: item.symbol, price: row.usd, change24h: row.usd_24h_change ?? 0 }];
    });
  } catch {
    return [];
  }
}

async function readState(env: Env): Promise<{ book: Snapshot; fills: LiveFill[] }> {
  const [book, fills] = await Promise.all([
    env.LIVE.get(BOOK_KEY, "json"),
    env.LIVE.get(FILLS_KEY, "json"),
  ]);
  return {
    book: isSnapshot(book) ? book : emptyBook(),
    fills: Array.isArray(fills) ? (fills as LiveFill[]) : [],
  };
}

async function writeState(env: Env, book: Snapshot, fills: LiveFill[]): Promise<void> {
  await Promise.all([
    env.LIVE.put(BOOK_KEY, JSON.stringify(book)),
    env.LIVE.put(FILLS_KEY, JSON.stringify(fills.slice(0, 80))),
  ]);
}

function keyOk(request: Request, env: Env): boolean {
  const expected = env.LIVE_KEY;
  if (!expected) return false;
  return request.headers.get("x-live-key") === expected;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

async function liveTick(env: Env) {
  const snap = await readState(env);
  const majors = await fetchMajors();
  const now = new Date();
  const intent = decide({
    majors,
    positions: snap.book.positions,
    fills: snap.fills,
    armed: snap.book.armed,
    buyingPower: snap.book.buyingPower,
    cryptoBuyingPower: snap.book.cryptoBuyingPower,
    now,
  });
  return {
    generatedAt: now.toISOString(),
    book: {
      armed: snap.book.armed,
      accountMasked: ACCOUNT,
      cash: snap.book.cash,
      buyingPower: snap.book.buyingPower,
      cryptoBuyingPower: snap.book.cryptoBuyingPower,
      positions: snap.book.positions,
      dailyNotional: dailySpent(snap.fills, now.toISOString()),
      lastTickAt: now.toISOString(),
      lastFillAt: snap.book.lastFillAt,
    },
    intent,
    fills: snap.fills.slice(0, 40),
    config: {
      clipUsd: CLIP,
      maxOpen: 1,
      stopPct: STOP,
      maxDailyNotional: MAX_DAILY,
      cooldownMs: COOLDOWN_MS,
    },
    notes: [
      "Live clips are Robinhood brokerage BTC/ETH/SOL (and SPY/NVDA in the cash session).",
      "Pons launches, CASHCAT, and trench lottery names are never auto-bought.",
      "Not financial advice.",
    ],
  };
}

function isFill(value: unknown): value is LiveFill {
  if (!value || typeof value !== "object") return false;
  const row = value as LiveFill;
  return (
    typeof row.id === "string" &&
    typeof row.at === "string" &&
    typeof row.symbol === "string" &&
    (row.side === "buy" || row.side === "sell")
  );
}

const STATUS_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Masters live desk</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #09090b; color: #fafafa; }
      main { max-width: 42rem; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
      h1 { font-size: 1.35rem; letter-spacing: -0.02em; margin: 0 0 0.35rem; }
      p.sub { color: #a1a1aa; margin: 0 0 1.5rem; font-size: 0.95rem; }
      .row { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem; }
      .pill { border: 1px solid #27272a; background: #18181b; border-radius: 999px; padding: 0.35rem 0.75rem; font-size: 0.8rem; }
      .pill.on { border-color: #14532d; background: #052e16; color: #86efac; }
      .pill.off { border-color: #7f1d1d; background: #450a0a; color: #fecaca; }
      pre { white-space: pre-wrap; word-break: break-word; background: #111113; border: 1px solid #27272a; border-radius: 0.75rem; padding: 1rem; font-size: 0.85rem; line-height: 1.45; }
      .err { color: #fca5a5; }
    </style>
  </head>
  <body>
    <main>
      <h1>Masters live desk</h1>
      <p class="sub">Robinhood Agentic ••••5205 · $10 clips · public kill switch</p>
      <div id="meta" class="row"><span class="pill">loading…</span></div>
      <pre id="out">Fetching /api/live…</pre>
    </main>
    <script>
      async function load() {
        const out = document.getElementById("out");
        const meta = document.getElementById("meta");
        try {
          const res = await fetch("/api/live", { cache: "no-store" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || res.statusText);
          const armed = Boolean(data.book && data.book.armed);
          meta.innerHTML =
            '<span class="pill ' + (armed ? "on" : "off") + '">' + (armed ? "armed" : "kill switch on") + "</span>" +
            '<span class="pill">' + (data.intent && data.intent.action ? data.intent.action : "hold") + "</span>" +
            '<span class="pill">' + (data.book && data.book.accountMasked ? data.book.accountMasked : "") + "</span>";
          out.textContent = (data.intent && data.intent.headline ? data.intent.headline + "\\n\\n" + (data.intent.body || "") : "") +
            "\\n\\n" + JSON.stringify(data, null, 2);
        } catch (error) {
          meta.innerHTML = '<span class="pill off">error</span>';
          out.className = "err";
          out.textContent = error instanceof Error ? error.message : "Live tick failed";
        }
      }
      load();
      setInterval(load, 15000);
    </script>
  </body>
</html>
`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    if (path === "/api/live" && request.method === "GET") {
      try {
        return json(await liveTick(env));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Live tick failed";
        return json({ error: message }, 502);
      }
    }

    if (path === "/api/live" && request.method === "POST") {
      let body: {
        action?: unknown;
        fill?: unknown;
        cash?: unknown;
        buyingPower?: unknown;
        cryptoBuyingPower?: unknown;
        positions?: unknown;
      };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      const snap = await readState(env);
      const action = body.action;
      switch (action) {
        case "kill": {
          snap.book.armed = false;
          await writeState(env, snap.book, snap.fills);
          return json({ ok: true, armed: false });
        }
        case "arm": {
          if (!keyOk(request, env)) return json({ error: "Live key required to arm" }, 401);
          snap.book.armed = true;
          await writeState(env, snap.book, snap.fills);
          return json({ ok: true, armed: true });
        }
        case "book": {
          if (!keyOk(request, env)) return json({ error: "Live key required" }, 401);
          if (typeof body.cash === "number") snap.book.cash = body.cash;
          if (typeof body.buyingPower === "number") snap.book.buyingPower = body.buyingPower;
          if (typeof body.cryptoBuyingPower === "number") {
            snap.book.cryptoBuyingPower = body.cryptoBuyingPower;
          }
          if (Array.isArray(body.positions)) {
            snap.book.positions = body.positions as LivePosition[];
          }
          await writeState(env, snap.book, snap.fills);
          return json({ ok: true });
        }
        case "record": {
          if (!keyOk(request, env)) return json({ error: "Live key required" }, 401);
          if (!isFill(body.fill)) return json({ error: "Missing fill" }, 400);
          snap.fills = [body.fill, ...snap.fills];
          if (body.fill.status === "filled" || body.fill.status === "submitted") {
            snap.book.lastFillAt = body.fill.at;
          }
          if (typeof body.cash === "number") snap.book.cash = body.cash;
          if (typeof body.buyingPower === "number") snap.book.buyingPower = body.buyingPower;
          if (typeof body.cryptoBuyingPower === "number") {
            snap.book.cryptoBuyingPower = body.cryptoBuyingPower;
          }
          if (Array.isArray(body.positions)) {
            snap.book.positions = body.positions as LivePosition[];
          }
          await writeState(env, snap.book, snap.fills);
          return json({ ok: true, fill: body.fill });
        }
        default:
          return json({ error: "Unknown action" }, 400);
      }
    }

    if (path === "/" || path === "/live") {
      return new Response(STATUS_HTML, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }

    return json({ error: "Not found" }, 404);
  },
};
