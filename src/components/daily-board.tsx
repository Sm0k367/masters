"use client";

import { AppShell } from "@/components/app-shell";
import { Disclaimer, ErrorState, LoadingState, Stat, Ticker } from "@/components/desk-ui";
import { TokenTable } from "@/components/token-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatUsd } from "@/lib/format";
import { flashTake } from "@/lib/score";
import { useLive } from "@/hooks/use-live";
import type { DailyBrief } from "@/lib/types";

export function DailyBoard({ initial }: { initial: DailyBrief | null }) {
  const { data, error, loading, updatedAt, reload } = useLive<DailyBrief>(
    "/api/brief",
    30_000,
    initial,
  );
  const brief = data ?? initial;

  if (loading && !brief) {
    return (
      <AppShell>
        <LoadingState />
      </AppShell>
    );
  }

  if (error && !brief) {
    return (
      <AppShell>
        <ErrorState message={error} onRetry={() => void reload()} />
      </AppShell>
    );
  }

  if (!brief) return null;

  const rh = brief.heat.find((item) => item.chain === "robinhood");
  const take = flashTake([
    ...brief.movers,
    ...brief.volumeLeaders,
    ...brief.stickier,
    ...brief.launches,
  ]);

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl tracking-tight">Robinhood Wallet daily</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Four buckets: chain heat, sub-48h launches, volume leaders, stickier names.
              What’s hot is almost entirely speculative. Treat it as a desk, not a signal to
              all-in.
            </p>
          </div>
          <div className="font-mono text-[11px] text-muted-foreground">
            as of{" "}
            {(updatedAt
              ? new Date(updatedAt)
              : new Date(brief.generatedAt)
            )
              .toISOString()
              .slice(11, 19)}{" "}
            UTC
          </div>
        </div>

        <Ticker majors={brief.majors} heat={brief.heat} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Robinhood DEX volume (tracked)"
            value={formatUsd(rh?.volume24h ?? 0)}
            hint={`${formatNumber(rh?.trades24h ?? 0)} prints on the sampled pools`}
          />
          <Stat
            label="New pools sampled"
            value={String(rh?.newPools24h ?? brief.launches.length)}
            hint="GeckoTerminal new-pool feed, last page"
          />
          <Stat
            label="Top sampled name"
            value={rh?.topSymbol ?? "—"}
            hint="Highest 24h volume on the Robinhood board"
          />
          <Stat
            label="Other-chain heat"
            value={formatUsd(
              brief.heat
                .filter((item) => item.chain !== "robinhood")
                .reduce((sum, item) => sum + item.volume24h, 0),
            )}
            hint="Solana + Base trending samples"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wide uppercase">
              Desk chief — flash take
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="max-w-4xl text-sm leading-relaxed">{take}</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="launches">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="launches">Sub-48h launches</TabsTrigger>
            <TabsTrigger value="movers">Hottest %</TabsTrigger>
            <TabsTrigger value="volume">Volume leaders</TabsTrigger>
            <TabsTrigger value="sticky">Stickier names</TabsTrigger>
            <TabsTrigger value="stocks">Tokenized stocks</TabsTrigger>
            <TabsTrigger value="chains">Other chains</TabsTrigger>
          </TabsList>
          <TabsContent value="launches" className="mt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Brand-new Pons / Uniswap pools. Insane 24h % on thin books. Lottery tickets.
            </p>
            <TokenTable
              pairs={brief.launches}
              empty="No fresh pools in the Gecko feed right now. Check DexScreener New Pairs."
            />
          </TabsContent>
          <TabsContent value="movers" className="mt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Giant percent moves. Those prints are usually already done. Do not chase the
              daily-report winner.
            </p>
            <TokenTable pairs={brief.movers} empty="No large percent moves in the sample." />
          </TabsContent>
          <TabsContent value="volume" className="mt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              What Wallet users can actually trade size in — not the +100,000% 16-hour name.
            </p>
            <TokenTable pairs={brief.volumeLeaders} empty="Volume board is empty." />
          </TabsContent>
          <TabsContent value="sticky" className="mt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              PONS, CASHCAT, Artificial Inu, and the liquid tokenized names. Still volatile.
              Lower (but still high) risk than whatever just launched.
            </p>
            <TokenTable pairs={brief.stickier} empty="Could not resolve sticky names." />
          </TabsContent>
          <TabsContent value="stocks" className="mt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Unique to Robinhood Chain. On-chain exposure to real-world names — not stock
              ownership. They still move with crypto liquidity.
            </p>
            <TokenTable
              pairs={brief.tokenized}
              empty="No tokenized names in this sample. Search NVDA, SPY, SPCX, META."
            />
          </TabsContent>
          <TabsContent value="chains" className="mt-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Same desk, other venues. Solana and Base trenches so you don’t get tunnel vision
              on chain 4663.
            </p>
            <TokenTable pairs={brief.otherChains} empty="Other-chain feeds are quiet." />
          </TabsContent>
        </Tabs>

        {brief.metas.length ? (
          <div className="flex flex-wrap gap-2">
            {brief.metas.map((meta) => (
              <Badge key={meta.slug} variant="outline" className="font-mono text-[11px]">
                {meta.name} · {formatUsd(meta.volume)} · {meta.tokenCount} tokens
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Reality check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {brief.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Sources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 font-mono text-xs text-muted-foreground">
              {brief.sources.map((source) => (
                <p key={source}>{source}</p>
              ))}
              <p>Cross-check: robinswap.trade/news · Wallet → Trending</p>
            </CardContent>
          </Card>
        </div>
        <Disclaimer />
      </div>
    </AppShell>
  );
}
