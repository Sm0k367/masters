"use client";

import { Disclaimer, ErrorState, Stat } from "@/components/desk-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLive } from "@/hooks/use-live";
import { formatPct, formatUsd } from "@/lib/format";
import type { LiveAction, LiveFill, LiveTick } from "@/lib/types";
import { Bot } from "lucide-react";

function stance(action: LiveAction): string {
  switch (action) {
    case "buy":
      return "BUY";
    case "sell":
      return "SELL";
    case "hold":
      return "HOLD";
    case "skip":
      return "SKIP";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

function fillTone(status: LiveFill["status"]): string {
  switch (status) {
    case "filled":
      return "text-gain";
    case "submitted":
      return "text-primary";
    case "preview":
      return "text-muted-foreground";
    case "rejected":
      return "text-loss";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function LiveDesk({ initial }: { initial: LiveTick | null }) {
  const { data, error, loading, reload } = useLive<LiveTick>(
    "/api/live",
    20_000,
    initial,
  );
  const busy = loading && !data;

  async function kill() {
    await fetch("/api/live", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "kill" }),
    });
    await reload();
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={() => void reload()} />;
  }

  if (busy || !data) {
    return (
      <p className="font-mono text-xs text-muted-foreground">
        Live agent is reading tape and the Agentic book…
      </p>
    );
  }

  const { book, intent, fills, config, notes } = data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl tracking-tight">Live trader</h1>
            <Badge variant={book.armed ? "default" : "destructive"}>
              {book.armed ? "ARMED" : "KILLED"}
            </Badge>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Automated desk on Robinhood Agentic {book.accountMasked}. It clips
            BTC / ETH / SOL 24/7, and SPY / NVDA only in the cash session. It never
            snipes Pons launches or CASHCAT. ${config.clipUsd} clip · max $
            {config.maxDailyNotional}/day · stop {config.stopPct}%. The site
            publishes intent and the kill switch; fills land on the Agentic book.
          </p>
        </div>
        <Button type="button" variant="destructive" onClick={() => void kill()}>
          Kill new clips
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Buying power"
          value={formatUsd(book.cryptoBuyingPower || book.buyingPower)}
          hint={`Cash ${formatUsd(book.cash)}`}
        />
        <Stat
          label="Open risk"
          value={
            book.positions[0]
              ? `${book.positions[0].symbol} ${formatUsd(book.positions[0].valueUsd)}`
              : "Flat"
          }
          hint={
            book.positions[0]
              ? `${formatPct(book.positions[0].pnlPct)} vs cost`
              : "One clip at a time"
          }
        />
        <Stat
          label="Today’s buys"
          value={formatUsd(book.dailyNotional)}
          hint={`Cap ${formatUsd(config.maxDailyNotional)}`}
        />
        <Stat
          label="Last fill"
          value={book.lastFillAt ? book.lastFillAt.slice(11, 19) + "Z" : "—"}
          hint={book.armed ? "Agent will fire when gates pass" : "Halted"}
        />
      </div>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-4" />
            Desk chief — live intent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{stance(intent.action)}</Badge>
            {intent.symbol ? (
              <span className="font-heading text-lg">{intent.symbol}</span>
            ) : null}
            {intent.notionalUsd > 0 ? (
              <span className="font-mono text-sm">{formatUsd(intent.notionalUsd)}</span>
            ) : null}
          </div>
          <p className="font-medium">{intent.headline}</p>
          <p className="text-sm text-muted-foreground">{intent.body}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Positions</CardTitle>
          </CardHeader>
          <CardContent>
            {book.positions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Flat. Next buy is a ${config.clipUsd} crypto clip unless the cash
                session maps stickier tape to SPY/NVDA.
              </p>
            ) : (
              <div className="space-y-2">
                {book.positions.map((pos) => (
                  <div
                    key={pos.symbol}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">{pos.symbol}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {pos.quantity.toPrecision(6)} · avg {formatUsd(pos.avgCost)} · {pos.venue}
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{formatUsd(pos.valueUsd)}</div>
                      <div className="font-mono text-xs">{formatPct(pos.pnlPct)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fills</CardTitle>
          </CardHeader>
          <CardContent>
            {fills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No live fills yet. The agent previews, then sends a marketable clip
                on the Agentic account.
              </p>
            ) : (
              <div className="space-y-2">
                {fills.slice(0, 12).map((fill) => (
                  <div
                    key={fill.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <div className="font-medium">
                        {fill.side.toUpperCase()} {fill.symbol}
                      </div>
                      <div className="text-xs text-muted-foreground">{fill.reason}</div>
                    </div>
                    <div className="text-right font-mono text-xs">
                      <div>{formatUsd(fill.notionalUsd)}</div>
                      <div className={fillTone(fill.status)}>{fill.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules this agent will not break</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </CardContent>
      </Card>
      <Disclaimer />
    </div>
  );
}
