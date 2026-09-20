"use client";

import { AppShell } from "@/components/app-shell";
import { Disclaimer, ErrorState, LoadingState } from "@/components/desk-ui";
import { TapeToggle } from "@/components/tape-toggle";
import { TokenTable } from "@/components/token-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains";
import { filterScan } from "@/lib/score";
import { useLive } from "@/hooks/use-live";
import type { ChainKey, ScanResponse, ScoredPair } from "@/lib/types";
import { useMemo, useState } from "react";

const LIQ_PRESETS = [0, 30_000, 50_000, 100_000];
const AGE_PRESETS = [
  { label: "5m–3h snipe", hours: 3 },
  { label: "Under 48h", hours: 48 },
  { label: "1–7d still alive", hours: 168 },
  { label: "Any age", hours: null },
] as const;

type ScanView = "new" | "trend";

function ScanTape({
  newPools,
  trending,
}: {
  newPools: ScoredPair[];
  trending: ScoredPair[];
}) {
  const [picked, setPicked] = useState<ScanView | null>(null);
  const view: ScanView = picked ?? (newPools.length ? "new" : "trend");
  const pairs = view === "new" ? newPools : trending;

  return (
    <div>
      <TapeToggle
        items={[
          { id: "new" as const, label: `New pairs (${newPools.length})` },
          { id: "trend" as const, label: `Trending (${trending.length})` },
        ]}
        value={view}
        onChange={setPicked}
        ariaLabel="Scanner views"
      />
      <div className="mt-4" data-tape-panel={view}>
        <h2 className="mb-3 font-heading text-lg tracking-tight">
          {view === "new" ? "New pairs" : "Trending"}
        </h2>
        <TokenTable
          pairs={pairs}
          empty={
            view === "new"
              ? "Nothing passed the filters. Loosen liquidity or age — or wait 10 minutes for the next ticker."
              : "No trending pools passed the filters on this chain."
          }
        />
      </div>
    </div>
  );
}

export function ScanBoard({ initial }: { initial: ScanResponse | null }) {
  const [chain, setChain] = useState<ChainKey>(initial?.chain ?? "robinhood");
  const [minLiq, setMinLiq] = useState(30_000);
  const [hideBoosted, setHideBoosted] = useState(true);
  const [preferredQuoteOnly, setPreferredQuoteOnly] = useState(true);
  const [maxAgeHours, setMaxAgeHours] = useState<number | null>(48);
  const seed = chain === initial?.chain ? initial : null;
  const { data, error, loading, reload } = useLive<ScanResponse>(
    `/api/scan?chain=${chain}`,
    30_000,
    seed,
  );
  const scan = data ?? seed;

  const newPools = useMemo(
    () =>
      filterScan(scan?.newPools ?? [], {
        minLiq,
        hideBoosted,
        preferredQuoteOnly,
        maxAgeHours,
        minAgeMinutes: 5,
      }),
    [scan, minLiq, hideBoosted, preferredQuoteOnly, maxAgeHours],
  );
  const trending = useMemo(
    () =>
      filterScan(scan?.trending ?? [], {
        minLiq,
        hideBoosted,
        preferredQuoteOnly,
      }),
    [scan, minLiq, hideBoosted, preferredQuoteOnly],
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
            <TapeToggle
              items={CHAIN_ORDER.map((key) => ({ id: key, label: CHAINS[key].label }))}
              value={chain}
              onChange={setChain}
              ariaLabel="Chain"
            />
            <div className="flex flex-wrap items-center gap-4">
              <TapeToggle
                items={LIQ_PRESETS.map((value) => ({
                  id: String(value),
                  label: value === 0 ? "Any liq" : `≥ $${Math.round(value / 1000)}k`,
                }))}
                value={String(minLiq)}
                onChange={(id) => setMinLiq(Number(id))}
                ariaLabel="Minimum liquidity"
              />
              <TapeToggle
                items={AGE_PRESETS.map((preset) => ({
                  id: preset.label,
                  label: preset.label,
                }))}
                value={
                  AGE_PRESETS.find((preset) => preset.hours === maxAgeHours)?.label ??
                  "Under 48h"
                }
                onChange={(label) => {
                  const preset = AGE_PRESETS.find((item) => item.label === label);
                  setMaxAgeHours(preset ? preset.hours : 48);
                }}
                ariaLabel="Pool age"
              />
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
                  Preferred quotes
                </label>
              </div>
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              Age 5–180 minutes for snipes · skip under $30–50k unless you accept a total
              loss · paid trending ≠ organic.
            </p>
          </CardContent>
        </Card>

        {error && !scan ? (
          <ErrorState message={error} onRetry={() => void reload()} />
        ) : loading && !scan ? (
          <LoadingState label="Scanning new pairs…" />
        ) : (
          <ScanTape key={chain} newPools={newPools} trending={trending} />
        )}
        <Disclaimer />
      </div>
    </AppShell>
  );
}
