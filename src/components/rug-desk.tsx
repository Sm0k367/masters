"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { AppShell } from "@/components/app-shell";
import { Disclaimer, ErrorState, Stat } from "@/components/desk-ui";
import { ClassBadge, TokenIdentity, VerdictBadge } from "@/components/token-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains";
import { formatAge, formatPct, formatUsd, shortAddress } from "@/lib/format";
import { rugToolLinks } from "@/lib/links";
import { rugVerdictLabel } from "@/lib/rug";
import type {
  CheckCategory,
  CheckStatus,
  ChainKey,
  DiligenceCheck,
  DiligenceReport,
  RugVerdict,
} from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

const CATEGORIES: { id: CheckCategory; label: string }[] = [
  { id: "honeypot", label: "Honeypot / tax" },
  { id: "contract", label: "Contract kill switches" },
  { id: "liquidity", label: "LP / book" },
  { id: "holders", label: "Holders" },
  { id: "solana", label: "Solana" },
  { id: "clones", label: "Clones" },
  { id: "tape", label: "Tape" },
];

function statusClass(status: CheckStatus): string {
  switch (status) {
    case "pass":
      return "border-gain/30 bg-gain/5";
    case "fail":
      return "border-loss/30 bg-loss/5";
    case "warn":
      return "border-warn/30 bg-warn/5";
    case "info":
      return "border-border bg-secondary/40";
    case "pending":
      return "border-border";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function meterColor(verdict: RugVerdict): string {
  switch (verdict) {
    case "hard_no":
      return "var(--loss)";
    case "caution":
      return "var(--warn)";
    case "watch":
      return "var(--muted-foreground)";
    case "clearer":
      return "var(--gain)";
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}

function ScoreRing({ score, verdict }: { score: number; verdict: RugVerdict }) {
  const color = meterColor(verdict);
  return (
    <div className="relative size-32 shrink-0">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(${color} ${score}%, color-mix(in oklch, var(--border) 80%, transparent) 0)`,
        }}
      />
      <div className="absolute inset-[9px] flex flex-col items-center justify-center rounded-full bg-card">
        <div className="font-heading text-3xl tracking-tight">{score}</div>
        <div className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          {rugVerdictLabel(verdict)}
        </div>
      </div>
    </div>
  );
}

function grouped(checks: DiligenceCheck[]) {
  return CATEGORIES.map((cat) => ({
    ...cat,
    items: checks.filter((item) => item.category === cat.id),
  })).filter((cat) => cat.items.length > 0);
}

function RugInner() {
  const params = useSearchParams();
  const qParam = params.get("q") ?? "";
  const chainParam = (params.get("chain") as ChainKey) || "robinhood";
  const [query, setQuery] = useState(qParam || "PONS");
  const [chain, setChain] = useState<ChainKey>(chainParam);
  const [report, setReport] = useState<DiligenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function run(q = query, nextChain = chain) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/diligence", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: trimmed, chain: nextChain }),
      });
      const body = (await response.json()) as DiligenceReport & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Check failed");
      setReport(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const fromUrl = qParam.trim();
    const q = fromUrl || query.trim() || "PONS";
    let cancelled = false;
    if (fromUrl) {
      setQuery(fromUrl);
      setChain(chainParam);
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const response = await fetch("/api/diligence", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q, chain: fromUrl ? chainParam : chain }),
        });
        const body = (await response.json()) as DiligenceReport & { error?: string };
        if (cancelled) return;
        if (!response.ok) throw new Error(body.error ?? "Check failed");
        setReport(body);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Check failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, chainParam]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run();
  }

  const failed = (report?.meter.hardFails ?? 0) > 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl tracking-tight">Rug checker</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Paste the exact contract. This desk simulates a buy/sell where the chain
          allows it, reads mint/freeze/blacklist/pause/proxy, LP lock, holders,
          clones, and tape. A quiet scanner is not safety. Default is no.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {CHAIN_ORDER.map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="xs"
                  variant={chain === key ? "default" : "outline"}
                  onClick={() => setChain(key)}
                >
                  {CHAINS[key].label}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Exact contract — never the ticker alone"
                className="font-mono"
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Scanning…" : "Run rug check"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading && !report ? (
        <p className="font-mono text-xs text-muted-foreground">
          Pulling GoPlus, Honeypot.is, RugCheck, and the tape…
        </p>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void run()} /> : null}

      {report?.pair ? (
        <Card className={failed ? "border-loss/40" : "border-primary/30"}>
          <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center">
            <ScoreRing score={report.meter.score} verdict={report.meter.verdict} />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <TokenIdentity pair={report.pair} />
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    className="font-mono"
                    variant={failed ? "destructive" : "default"}
                  >
                    {rugVerdictLabel(report.meter.verdict)}
                  </Badge>
                  <div className="flex gap-1">
                    <VerdictBadge pair={report.pair} />
                    <ClassBadge pair={report.pair} />
                  </div>
                </div>
              </div>
              <p className="font-medium">{report.meter.headline}</p>
              <p className="font-mono text-[11px] break-all text-muted-foreground">
                {report.pair.base.address}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {report?.pair ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Hard fails"
            value={String(report.meter.hardFails)}
            hint={`${report.meter.warns} warnings`}
          />
          <Stat
            label="Liquidity"
            value={formatUsd(report.pair.liquidityUsd)}
            hint={
              report.pair.impactFor1k != null
                ? `$1k ≈ ${report.pair.impactFor1k.toFixed(1)}% of book`
                : report.pair.quote.symbol
            }
          />
          <Stat
            label="Age"
            value={formatAge(report.pair.ageMs)}
            hint={`${report.pair.dexLabel} · ${report.pair.quote.symbol}`}
          />
          <Stat
            label="Holders"
            value={
              report.goplus?.holderCount
                ? report.goplus.holderCount.toLocaleString()
                : "—"
            }
            hint={
              report.top10Percent != null
                ? `Top wallets ≈ ${report.top10Percent.toFixed(0)}%`
                : "Concentration unknown"
            }
          />
        </div>
      ) : null}

      {report?.killSwitches.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {report.killSwitches.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border px-3 py-2.5 ${statusClass(item.status)}`}
            >
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {item.status}
              </div>
              <div className="mt-0.5 text-sm font-medium">{item.label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {report?.sim ? (
        <Card>
          <CardHeader>
            <CardTitle>Live buy/sell simulation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Honeypot"
              value={report.sim.isHoneypot ? "YES — SKIP" : "Not flagged"}
              hint={report.sim.risk ? `Risk ${report.sim.risk}` : "Honeypot.is"}
            />
            <Stat
              label="Sim tax"
              value={`buy ${report.sim.buyTax ?? 0}% / sell ${report.sim.sellTax ?? 0}%`}
              hint={
                report.sim.holderFailedPct != null
                  ? `${report.sim.holderFailedPct.toFixed(1)}% sampled holders fail sell`
                  : "Round-trip sim"
              }
            />
            <Stat
              label="Gas"
              value={`${report.sim.buyGas ?? "—"} / ${report.sim.sellGas ?? "—"}`}
              hint="Buy gas / sell gas"
            />
          </CardContent>
        </Card>
      ) : null}

      {report?.lp ? (
        <Card>
          <CardHeader>
            <CardTitle>LP lock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>Locked / burned</span>
                <span>{(report.lp.lockedPct ?? 0).toFixed(0)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gain"
                  style={{ width: `${Math.min(100, report.lp.lockedPct ?? 0)}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {(report.lp.burnedPct ?? 0).toFixed(0)}% burned ·{" "}
                {report.lp.holderCount ?? 0} LP holders. Unlocked LP is the rug
                button — especially UniV3 NFTs the owner can withdraw.
              </p>
            </div>
            {report.lp.unlockedTop.length ? (
              <div className="space-y-1.5 font-mono text-xs">
                {report.lp.unlockedTop.map((row) => (
                  <div key={row.address} className="flex justify-between gap-3">
                    <span>{shortAddress(row.address, 6)}</span>
                    <span>
                      {row.percent.toFixed(1)}% unlocked
                      {row.isContract ? " · contract" : ""}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {report?.holders.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Top holders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {report.holders.slice(0, 10).map((holder) => (
              <div key={holder.address} className="space-y-1">
                <div className="flex justify-between gap-3 font-mono text-xs">
                  <span>
                    {shortAddress(holder.address, 6)}
                    {holder.locked ? " · locked" : ""}
                    {holder.tag ? ` · ${holder.tag}` : ""}
                    {holder.isContract ? " · contract" : ""}
                  </span>
                  <span>{holder.percent.toFixed(2)}%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, holder.percent)}%` }}
                  />
                </div>
              </div>
            ))}
            {report.top10Percent != null ? (
              <p className="text-xs text-muted-foreground">
                Top wallets ex-burn ≈ {report.top10Percent.toFixed(1)}% · creator{" "}
                {report.creatorPercent?.toFixed(2) ?? "—"}% · owner{" "}
                {report.ownerPercent?.toFixed(2) ?? "—"}%
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {report?.pair ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            label="H1 tape"
            value={
              report.pair.buyPressureH1 != null
                ? `${Math.round(report.pair.buyPressureH1 * 100)}% buys`
                : "—"
            }
            hint={
              report.pair.uniqueMakersH1 != null
                ? `${report.pair.uniqueMakersH1} unique makers`
                : "Makers unknown"
            }
          />
          <Stat
            label="24h change"
            value={formatPct(report.pair.change.h24)}
            hint={`Vol ${formatUsd(report.pair.volume.h24)}`}
          />
          <Stat
            label="FDV"
            value={formatUsd(report.pair.fdvUsd)}
            hint={report.pair.boosted ? "Boosted ad" : "No DexScreener boost"}
          />
        </div>
      ) : null}

      {report
        ? grouped(report.checks).map((cat) => (
            <div key={cat.id} className="space-y-2">
              <h2 className="font-heading text-lg tracking-tight">{cat.label}</h2>
              <div className="grid gap-2">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3 py-3 ${statusClass(item.status)}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.label}</div>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {item.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        : null}

      {report?.clones.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Clone tickers on this chain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report.clones.map((clone) => (
              <div key={clone.id} className="flex justify-between gap-3 font-mono text-xs">
                <span>{shortAddress(clone.base.address)}</span>
                <span>
                  liq {formatUsd(clone.liquidityUsd)} · vol {formatUsd(clone.volume.h24)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {report?.pair ? (
        <Card>
          <CardHeader>
            <CardTitle>Open the same contract elsewhere</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {rugToolLinks(report.pair).map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {report?.sources.length ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          {report.sources
            .map((source) => `${source.name}: ${source.ok ? source.note : source.note}`)
            .join(" · ")}
        </p>
      ) : null}

      <Disclaimer />
    </div>
  );
}

export function RugDesk() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <p className="font-mono text-xs text-muted-foreground">Loading rug checker…</p>
        }
      >
        <RugInner />
      </Suspense>
    </AppShell>
  );
}
