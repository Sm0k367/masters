"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { AppShell } from "@/components/app-shell";
import { Disclaimer } from "@/components/desk-ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHAINS } from "@/lib/chains";
import { ponsLaunchpad, robinSwap } from "@/lib/links";
import { useEffect, useState } from "react";

const ROUTINE_KEY = "masters.routine.v1";

const ROUTINE = [
  { id: "morning-heat", label: "RobinSwap / Gecko top volume" },
  { id: "wallet-trend", label: "Wallet trending on Robinhood Chain" },
  { id: "base-layer", label: "Note PONS, CASHCAT, AI, NVDA/SPY/SPCX" },
  { id: "new-pairs", label: "Only then open New Pairs" },
  { id: "gmgn", label: "GMGN trenches / smart money — are wallets real?" },
  { id: "night", label: "Night: 3 lines — pumped / held volume / died" },
];

const TABS = [
  {
    title: "1. DexScreener New Pairs",
    href: "https://dexscreener.com/new-pairs/robinhood",
    body: "Best default scanner. Age, liquidity, buys/sells, charts. If you only open one tab, this is it.",
  },
  {
    title: "2. GMGN Trenches",
    href: "https://gmgn.ai/robinhood",
    body: "Is anyone real buying this, or is it bots looping? Smart-money wallets beat raw volume.",
  },
  {
    title: "3. Birdeye",
    href: "https://birdeye.so/robinhood",
    body: "Second screen. Large trades and wallet PnL. Cross-check DexScreener, don’t replace it.",
  },
  {
    title: "4. Pons launchpad",
    href: ponsLaunchpad(),
    body: "Most new Wallet-hot coins start here. Scan Pons first, then confirm the same contract on DexScreener/GMGN.",
  },
  {
    title: "5. Gecko / RobinSwap",
    href: robinSwap(),
    body: "Cleanest raw pool data. RobinSwap’s daily top-10 is built from Gecko. Verify a pair here, don’t snipe first.",
  },
  {
    title: "6. Uniswap or Wallet swap",
    href: CHAINS.robinhood.uniswap ?? "https://app.uniswap.org",
    body: "Execute after you paste the exact contract. Slippage only as high as needed. High slippage on a new pair is how you get sandwiched.",
  },
  {
    title: "7. Blockscout 4663",
    href: "https://robinhoodchain.blockscout.com",
    body: "Explorer for chain ID 4663. Confirm one token, not a clone ticker.",
  },
  {
    title: "8. X search",
    href: "https://x.com/search?q=robinhood%20chain&src=typed_query",
    body: "Ticker + contract. That’s the whole cockpit. Don’t add 12 more sites.",
  },
];

export default function CockpitPage() {
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROUTINE_KEY);
      if (raw) setDone(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore */
    }
  }, []);

  function toggle(id: string) {
    setDone((current) => {
      const next = { ...current, [id]: !current[id] };
      localStorage.setItem(ROUTINE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl tracking-tight">The perfect setup</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            One machine, two screens if you can. Phone is backup only. Wallets: Robinhood
            Wallet for trending + risk labels, Rabby or MetaMask as a separate trench
            wallet. Keep dry powder in USDG, a little ETH for gas, never size in the hot
            wallet you use for new pairs.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>Robinhood Chain</CardTitle>
            </CardHeader>
            <CardContent className="font-mono text-xs leading-relaxed text-muted-foreground">
              Chain ID 4663
              <br />
              Gas in ETH
              <br />
              Quotes: WETH / USDG
              <br />
              Uniswap V3/V4 for size
              <br />
              Pons for launches
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>What perfect is not</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Not 8 Telegram sniper bots. Not buying every Hood/Cat/Uranus clone. Not using
              your main bag wallet for 1-hour-old pools.
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>How to trade it</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              Discover → confirm on Gecko + explorer → execute in Wallet or Uniswap →
              take partials on the way up. These names usually don’t trend for days.
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {TABS.map((tab) => (
            <a
              key={tab.title}
              href={tab.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <div className="font-medium">{tab.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{tab.body}</p>
              <p className="mt-2 font-mono text-[11px] text-primary">Open ↗</p>
            </a>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily routine (10–15 min)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ROUTINE.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={Boolean(done[item.id])}
                  onChange={() => toggle(item.id)}
                />
                <span className={done[item.id] ? "text-muted-foreground line-through" : ""}>
                  {item.label}
                </span>
              </label>
            ))}
          </CardContent>
        </Card>
        <Disclaimer />
      </div>
    </AppShell>
  );
}
