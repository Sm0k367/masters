"use client";

import { AppShell } from "@/components/app-shell";
import { Disclaimer, ErrorState, LoadingState } from "@/components/desk-ui";
import { TokenTable } from "@/components/token-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains";
import { filterScan } from "@/lib/score";
import { useLive } from "@/hooks/use-live";
import type { ChainKey, ScanResponse } from "@/lib/types";
import { useMemo, useState } from "react";

const LIQ_PRESETS = [0, 30_000, 50_000, 100_000];

export default function ScanPage() {
  const [chain, setChain] = useState<ChainKey>("robinhood");
  const [minLiq, setMinLiq] = useState(30_000);
  const [hideBoosted, setHideBoosted] = useState(true);
  const [preferredQuoteOnly, setPreferredQuoteOnly] = useState(true);
  const [maxAgeHours, setMaxAgeHours] = useState<number | null>(48);
  const { data, error, loading, reload } = useLive<ScanResponse>(
    `/api/scan?chain=${chain}`,
    20_000,
  );

  const newPools = useMemo(
    () =>
      filterScan(data?.newPools ?? [], {
        minLiq,
        hideBoosted,
        preferredQuoteOnly,
        maxAgeHours,
        minAgeMinutes: 5,
      }),
    [data, minLiq, hideBoosted, preferredQuoteOnly, maxAgeHours],
  );
  const trending = useMemo(
    () =>
      filterScan(data?.trending ?? [], {
        minLiq,
        hideBoosted,
        preferredQuoteOnly,
      }),
    [data, minLiq, hideBoosted, preferredQuoteOnly],
  );

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">Scanner</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            DexScreener is the best default scanner. This board is the GeckoTerminal
            twin: new pools + trending, with the filters that actually matter. GMGN
            still wins for “is anyone real buying this?”
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-xs tracking-wide uppercase">
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {CHAIN_ORDER.map((key) => (
                <Button
                  key={key}
                  size="xs"
                  variant={chain === key ? "default" : "outline"}
                  onClick={() => setChain(key)}
                >
                  {CHAINS[key].label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap gap-1.5">
                {LIQ_PRESETS.map((value) => (
                  <Button
                    key={value}
                    size="xs"
                    variant={minLiq === value ? "secondary" : "ghost"}
                    onClick={() => setMinLiq(value)}
                  >
                    {value === 0 ? "Any liq" : `≥ $${Math.round(value / 1000)}k`}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "5m–3h snipe", hours: 3 },
                  { label: "Under 48h", hours: 48 },
                  { label: "1–7d still alive", hours: 168 },
                  { label: "Any age", hours: null },
                ].map((preset) => (
                  <Button
                    key={preset.label}
                    size="xs"
                    variant={maxAgeHours === preset.hours ? "secondary" : "ghost"}
                    onClick={() => setMaxAgeHours(preset.hours)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="boost"
                  checked={hideBoosted}
                  onCheckedChange={setHideBoosted}
                />
                <label htmlFor="boost" className="text-xs">
                  Hide boosted
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="quote"
                  checked={preferredQuoteOnly}
                  onCheckedChange={setPreferredQuoteOnly}
                />
                <label htmlFor="quote" className="text-xs">
                  WETH / USDG / USDC / SOL
                </label>
              </div>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              Age 5–180 minutes for snipes · skip under $30–50k unless you accept a total
              loss · paid trending ≠ organic.
            </p>
          </CardContent>
        </Card>

        {error && !data ? (
          <ErrorState message={error} onRetry={() => void reload()} />
        ) : loading && !data ? (
          <LoadingState label="Scanning new pairs…" />
        ) : (
          <Tabs defaultValue="new">
            <TabsList>
              <TabsTrigger value="new">New pairs ({newPools.length})</TabsTrigger>
              <TabsTrigger value="trend">Trending ({trending.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="mt-4">
              <TokenTable
                pairs={newPools}
                empty="Nothing passed the filters. Loosen liquidity or age — or wait 10 minutes for the next ticker."
              />
            </TabsContent>
            <TabsContent value="trend" className="mt-4">
              <TokenTable
                pairs={trending}
                empty="No trending pools passed the filters on this chain."
              />
            </TabsContent>
          </Tabs>
        )}
        <Disclaimer />
      </div>
    </AppShell>
  );
}
