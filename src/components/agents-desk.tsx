"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import { AgentReport } from "@/components/agent-report";
import { Disclaimer, ErrorState } from "@/components/desk-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains";
import type { ChainKey, DeskReport } from "@/lib/types";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export function AgentsDesk() {
  const params = useSearchParams();
  const qParam = params.get("q") ?? "";
  const chainParam = (params.get("chain") as ChainKey) || "robinhood";
  const [query, setQuery] = useState(qParam || "PONS");
  const [chain, setChain] = useState<ChainKey>(chainParam);
  const [llm, setLlm] = useState(true);
  const [report, setReport] = useState<DeskReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function run(q = query, nextChain = chain) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: trimmed, chain: nextChain, llm }),
      });
      const body = (await response.json()) as DeskReport & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Desk failed");
      setReport(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Desk failed");
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
        const response = await fetch("/api/agents", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ q, chain: fromUrl ? chainParam : chain, llm }),
        });
        const body = (await response.json()) as DeskReport & { error?: string };
        if (cancelled) return;
        if (!response.ok) throw new Error(body.error ?? "Desk failed");
        setReport(body);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Desk failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // query/chain are form state; URL + llm own the auto-run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam, chainParam, llm]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void run();
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl tracking-tight">Trading agents</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Six specialists read the same tape: Scout, Tape, Depth, Risk, Narrative, Desk
          chief. They do not place orders. They tell you skip / lottery / watch /
          small-size, then you execute in Wallet or Uniswap.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-xs tracking-wide uppercase">
            Run the desk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
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
                placeholder="Contract or ticker — PONS, CASHCAT, 0x…"
                className="font-mono"
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Reading tape…" : "Run agents"}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="llm" checked={llm} onCheckedChange={setLlm} />
              <label htmlFor="llm" className="text-xs text-muted-foreground">
                LLM tape note via FreeLLMAPI / Pollinations. Falls back to the rules desk
                if the model is down.
              </label>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading && !report ? (
        <p className="font-mono text-xs text-muted-foreground">Reading tape…</p>
      ) : null}
      {error ? <ErrorState message={error} onRetry={() => void run()} /> : null}
      {report ? <AgentReport report={report} /> : null}
      {!report && !loading && !error ? (
        <p className="text-sm text-muted-foreground">
          Try PONS, CASHCAT, NVDA, or paste a contract from the scanner.
        </p>
      ) : null}
      <Disclaimer />
    </div>
  );
}
