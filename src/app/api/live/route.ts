import { liveKeyOk, loadLiveTick, readSnapshot, writeSnapshot } from "@/lib/live-store";
import type { LiveFill, LivePosition } from "@/lib/types";

export const dynamic = "force-dynamic";

type Action = "kill" | "arm" | "record" | "book";

function isAction(value: unknown): value is Action {
  return value === "kill" || value === "arm" || value === "record" || value === "book";
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

export async function GET() {
  try {
    return Response.json(await loadLiveTick());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live tick failed";
    return Response.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
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
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAction(body.action)) {
    return Response.json({ error: "Unknown action" }, { status: 400 });
  }

  const snap = await readSnapshot();

  switch (body.action) {
    case "kill": {
      snap.book.armed = false;
      await writeSnapshot(snap);
      return Response.json({ ok: true, armed: false });
    }
    case "arm": {
      if (!liveKeyOk(request)) {
        return Response.json({ error: "Live key required to arm" }, { status: 401 });
      }
      snap.book.armed = true;
      await writeSnapshot(snap);
      return Response.json({ ok: true, armed: true });
    }
    case "book": {
      if (!liveKeyOk(request)) {
        return Response.json({ error: "Live key required" }, { status: 401 });
      }
      if (typeof body.cash === "number") snap.book.cash = body.cash;
      if (typeof body.buyingPower === "number") snap.book.buyingPower = body.buyingPower;
      if (typeof body.cryptoBuyingPower === "number") {
        snap.book.cryptoBuyingPower = body.cryptoBuyingPower;
      }
      if (Array.isArray(body.positions)) {
        snap.book.positions = body.positions as LivePosition[];
      }
      await writeSnapshot(snap);
      return Response.json({ ok: true });
    }
    case "record": {
      if (!liveKeyOk(request)) {
        return Response.json({ error: "Live key required" }, { status: 401 });
      }
      if (!isFill(body.fill)) {
        return Response.json({ error: "Missing fill" }, { status: 400 });
      }
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
      await writeSnapshot(snap);
      return Response.json({ ok: true, fill: body.fill });
    }
    default: {
      const _exhaustive: never = body.action;
      return Response.json({ error: String(_exhaustive) }, { status: 400 });
    }
  }
}
