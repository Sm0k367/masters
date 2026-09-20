"use client";

import { AppShell } from "@/components/app-shell";
import { Disclaimer, ErrorState, LoadingState, Stat } from "@/components/desk-ui";
import { TokenTable } from "@/components/token-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import { useLive } from "@/hooks/use-live";
import type { ChainBoard } from "@/lib/types";

export default function ChainsPage() {
  const { data, error, loading, reload } = useLive<ChainBoard>("/api/chains", 40_000);

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

        {error && !data ? (
          <ErrorState message={error} onRetry={() => void reload()} />
        ) : loading && !data ? (
          <LoadingState />
        ) : data ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.boards.map((board) => (
                <Stat
                  key={board.chain}
                  label={board.label}
                  value={formatUsd(board.volume24h)}
                  hint={board.trending[0]?.base.symbol ?? "no trench names"}
                />
              ))}
            </div>
            {data.boards.map((board) => (
              <Card key={board.chain}>
                <CardHeader>
                  <CardTitle>{board.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <TokenTable
                    pairs={board.trending}
                    empty={`No trench names on ${board.label} in this sample.`}
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
