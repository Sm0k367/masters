"use client";

import { AppShell } from "@/components/app-shell";
import { Disclaimer, ErrorState, LoadingState, Stat } from "@/components/desk-ui";
import { TokenTable } from "@/components/token-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import { useLive } from "@/hooks/use-live";
import type { ChainBoard } from "@/lib/types";

export function ChainsBoard({ initial }: { initial: ChainBoard | null }) {
  const { data, error, loading, reload } = useLive<ChainBoard>(
    "/api/chains",
    40_000,
    initial,
  );
  const board = data ?? initial;

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">All-chain board</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Same agents, every trench that actually prints: Robinhood, Solana, Base,
            Ethereum, BNB, Arbitrum, Hyperliquid. Plasma, Monad, Sui, TON stay on the
            scanner when you want them.
          </p>
        </div>

        {error && !board ? (
          <ErrorState message={error} onRetry={() => void reload()} />
        ) : loading && !board ? (
          <LoadingState />
        ) : board ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {board.boards.map((row) => (
                <Stat
                  key={row.chain}
                  label={row.label}
                  value={formatUsd(row.volume24h)}
                  hint={row.trending[0]?.base.symbol ?? "no trench names"}
                />
              ))}
            </div>
            {board.boards.map((row) => (
              <Card key={row.chain}>
                <CardHeader>
                  <CardTitle>{row.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <TokenTable
                    pairs={row.trending}
                    empty={`No trench names on ${row.label} in this sample.`}
                  />
                </CardContent>
              </Card>
            ))}
          </>
        ) : null}
        <Disclaimer />
      </div>
    </AppShell>
  );
}
