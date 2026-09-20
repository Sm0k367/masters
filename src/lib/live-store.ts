import { getCloudflareContext } from "@opennextjs/cloudflare";
import { LIVE_ACCOUNT_MASKED, runLiveTick } from "@/lib/trader";
import type { LiveBook, LiveFill, LivePosition, LiveTick } from "@/lib/types";

const BOOK_KEY = "book";
const FILLS_KEY = "fills";

type Kv = {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
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

const memory: { book: Snapshot; fills: LiveFill[] } = {
  book: emptyBook(),
  fills: [],
};

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

async function kv(): Promise<Kv | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    const live = (ctx.env as { LIVE?: Kv }).LIVE;
    return live ?? null;
  } catch {
    return null;
  }
}

export async function readSnapshot(): Promise<{ book: Snapshot; fills: LiveFill[] }> {
  const store = await kv();
  if (!store) return { book: memory.book, fills: memory.fills };
  const [book, fills] = await Promise.all([
    store.get(BOOK_KEY, "json"),
    store.get(FILLS_KEY, "json"),
  ]);
  return {
    book: isSnapshot(book) ? book : emptyBook(),
    fills: Array.isArray(fills) ? (fills as LiveFill[]) : [],
  };
}

export async function writeSnapshot(next: { book: Snapshot; fills: LiveFill[] }): Promise<void> {
  memory.book = next.book;
  memory.fills = next.fills.slice(0, 80);
  const store = await kv();
  if (!store) return;
  await Promise.all([
    store.put(BOOK_KEY, JSON.stringify(next.book)),
    store.put(FILLS_KEY, JSON.stringify(next.fills.slice(0, 80))),
  ]);
}

export async function loadLiveTick(): Promise<LiveTick> {
  const snap = await readSnapshot();
  const tick = await runLiveTick({
    ...snap.book,
    fills: snap.fills,
  });
  return {
    ...tick,
    book: {
      ...tick.book,
      ...toLiveBook(snap.book, snap.fills),
      lastTickAt: tick.generatedAt,
      dailyNotional: tick.book.dailyNotional,
      armed: snap.book.armed,
    },
  };
}

export function toLiveBook(snapshot: Snapshot, fills: LiveFill[]): LiveBook {
  const lastFill = fills.find(
    (fill) => fill.status === "filled" || fill.status === "submitted",
  );
  return {
    armed: snapshot.armed,
    accountMasked: LIVE_ACCOUNT_MASKED,
    cash: snapshot.cash,
    buyingPower: snapshot.buyingPower,
    cryptoBuyingPower: snapshot.cryptoBuyingPower,
    positions: snapshot.positions,
    dailyNotional: 0,
    lastTickAt: snapshot.lastTickAt,
    lastFillAt: lastFill?.at ?? snapshot.lastFillAt,
  };
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== "object") return false;
  const row = value as Snapshot;
  return typeof row.armed === "boolean" && typeof row.buyingPower === "number";
}

export function liveKeyOk(request: Request): boolean {
  const expected = process.env.LIVE_KEY;
  if (!expected) return false;
  return request.headers.get("x-live-key") === expected;
}
