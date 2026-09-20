"use client";

import { classLabel } from "@/lib/classify";
import { clsChange, formatAge, formatNumber, formatPct, formatUsd } from "@/lib/format";
import { verdictLabel } from "@/lib/score";
import type { ScoredPair } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function VerdictBadge({ pair }: { pair: ScoredPair }) {
  const tone =
    pair.verdict === "skip"
      ? "bg-loss/15 text-loss"
      : pair.verdict === "lottery"
        ? "bg-warn/15 text-warn"
        : pair.verdict === "watch"
          ? "bg-muted text-muted-foreground"
          : pair.verdict === "size"
            ? "bg-gain/15 text-gain"
            : "bg-primary/15 text-primary";
  return (
    <Badge variant="outline" className={`border-0 font-mono ${tone}`}>
      {verdictLabel(pair.verdict)}
    </Badge>
  );
}

export function ClassBadge({ pair }: { pair: ScoredPair }) {
  return (
    <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
      {classLabel(pair.tokenClass)}
    </Badge>
  );
}

export function Change({ value }: { value: number | null | undefined }) {
  return <span className={`font-mono tabular-nums ${clsChange(value)}`}>{formatPct(value)}</span>;
}

export function TokenIdentity({
  pair,
  compact = false,
}: {
  pair: ScoredPair;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-[11px] text-primary">
        {pair.base.symbol.slice(0, 3)}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{pair.base.symbol}</span>
          {pair.boosted ? (
            <span className="font-mono text-[10px] text-warn">boosted</span>
          ) : null}
        </div>
        {!compact ? (
          <div className="truncate font-mono text-[11px] text-muted-foreground">
            {pair.chainLabel} · {pair.quote.symbol} · {formatAge(pair.ageMs)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TokenActions({ pair }: { pair: ScoredPair }) {
  const q = encodeURIComponent(pair.base.address || pair.base.symbol);
  return (
    <div className="flex justify-end gap-1">
      <Button size="xs" variant="ghost" asChild>
        <Link href={`/diligence?chain=${pair.chain}&q=${q}`}>Rug</Link>
      </Button>
      <Button size="xs" variant="outline" asChild>
        <Link href={`/agents?chain=${pair.chain}&q=${q}`}>Desk</Link>
      </Button>
    </div>
  );
}

export function TokenTable({
  pairs,
  empty,
}: {
  pairs: ScoredPair[];
  empty: string;
}) {
  if (!pairs.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-[11px] tracking-wide text-muted-foreground uppercase">
          <tr className="border-b border-border">
            <th className="py-2 pr-3 font-medium">Token</th>
            <th className="py-2 pr-3 font-medium">Verdict</th>
            <th className="py-2 pr-3 font-medium">Price</th>
            <th className="py-2 pr-3 font-medium">24h</th>
            <th className="py-2 pr-3 font-medium">Vol</th>
            <th className="py-2 pr-3 font-medium">Liq</th>
            <th className="py-2 pr-3 font-medium">Tx H1</th>
            <th className="py-2 pr-3 font-medium">Age</th>
            <th className="py-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair) => (
            <tr key={pair.id} className="border-b border-border/60 hover:bg-secondary/40">
              <td className="py-2.5 pr-3">
                <TokenIdentity pair={pair} />
              </td>
              <td className="py-2.5 pr-3">
                <div className="flex flex-col gap-1">
                  <VerdictBadge pair={pair} />
                  <ClassBadge pair={pair} />
                </div>
              </td>
              <td className="py-2.5 pr-3 font-mono tabular-nums">{formatUsd(pair.priceUsd, 4)}</td>
              <td className="py-2.5 pr-3">
                <Change value={pair.change.h24} />
              </td>
              <td className="py-2.5 pr-3 font-mono tabular-nums">{formatUsd(pair.volume.h24)}</td>
              <td className="py-2.5 pr-3 font-mono tabular-nums">{formatUsd(pair.liquidityUsd)}</td>
              <td className="py-2.5 pr-3 font-mono text-xs tabular-nums text-muted-foreground">
                {formatNumber(pair.txns.h1.buys)}/{formatNumber(pair.txns.h1.sells)}
              </td>
              <td className="py-2.5 pr-3 font-mono text-xs">{formatAge(pair.ageMs)}</td>
              <td className="py-2.5">
                <TokenActions pair={pair} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
