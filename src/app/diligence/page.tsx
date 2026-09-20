"use client";

import { AppShell } from "@/components/app-shell";
import { Disclaimer, ErrorState } from "@/components/desk-ui";
import { ClassBadge, TokenIdentity, VerdictBadge } from "@/components/token-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatUsd, shortAddress } from "@/lib/format";
import { externalLinks } from "@/lib/links";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains";
import type { ChainKey, DiligenceReport } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

function statusClass(status: DiligenceReport["checks"][number]["status"]): string {
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

function DiligenceInner() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [chain, setChain] = useState<ChainKey>(
    (params.get("chain") as ChainKey) || "robinhood",
  );
  const [report, setReport] = useState<DiligenceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const q = params.get("q");
    if (!q) return;
    const nextChain = (params.get("chain") as ChainKey) || "robinhood";
    const timer = window.setTimeout(() => {
      void run(q, nextChain);
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run();
  }

  const failed = report?.checks.some((check) => check.status === "fail");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl tracking-tight">60-second checklist</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Copy contract from the scanner. Paste the same contract here, in Wallet, in
          Blockscout, and in GMGN. If any step fails, skip. There will be another ticker
          in 10 minutes.
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
                {loading ? "Checking…" : "Run checklist"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? <ErrorState message={error} onRetry={() => void run()} /> : null}

      {report?.pair ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <TokenIdentity pair={report.pair} />
            <div className="flex flex-col items-end gap-1">
              <VerdictBadge pair={report.pair} />
              <ClassBadge pair={report.pair} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {externalLinks(report.pair).map((link) => (
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

      {failed ? (
        <div className="rounded-xl border border-loss/40 bg-loss/10 px-4 py-3 text-sm text-loss">
          A hard fail is on the list. Default is no.
        </div>
      ) : null}

      {report ? (
        <div className="grid gap-2">
          {report.checks.map((item, index) => (
            <div
              key={item.id}
              className={`rounded-xl border px-3 py-3 ${statusClass(item.status)}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">
                  {index + 1}. {item.label}
                </div>
                <Badge variant="outline" className="font-mono text-[10px] uppercase">
                  {item.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : null}

      {report?.holders.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Top holders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs">
            {report.holders.map((holder) => (
              <div key={holder.address} className="flex justify-between gap-3">
                <span>{shortAddress(holder.address, 6)}</span>
                <span>
                  {holder.percent.toFixed(2)}%
                  {holder.locked ? " · locked" : ""}
                  {holder.tag ? ` · ${holder.tag}` : ""}
                </span>
              </div>
            ))}
            {report.top10Percent != null ? (
              <p className="text-muted-foreground">
                Top wallets ex-burn ≈ {report.top10Percent.toFixed(1)}% · liq{" "}
                {formatUsd(report.pair?.liquidityUsd ?? 0)}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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

      <Disclaimer />
    </div>
  );
}

export default function DiligencePage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="font-mono text-xs text-muted-foreground">Loading checklist…</p>}>
        <DiligenceInner />
      </Suspense>
    </AppShell>
  );
}
