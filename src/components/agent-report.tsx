import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verdictLabel } from "@/lib/score";
import type { DeskReport } from "@/lib/types";
import { TokenIdentity, VerdictBadge } from "@/components/token-table";
import { formatUsd } from "@/lib/format";
import { externalLinks, uniswapSwap } from "@/lib/links";

export function AgentReport({ report }: { report: DeskReport }) {
  const chief = report.chief;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-3">
              <TokenIdentity pair={report.pair} />
            </CardTitle>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {report.briefing}
            </p>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              {report.llmUsed
                ? `LLM pass · ${report.llmModel}`
                : "Rules desk (no LLM key). Add FreeLLMAPI for a written tape note."}
            </p>
          </div>
          <VerdictBadge pair={report.pair} />
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
          <a
            href={uniswapSwap(report.pair.chain, report.pair.base.address)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-primary/30 px-2 py-1 font-mono text-[11px] text-primary"
          >
            Trade
          </a>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {report.agents.map((agent) => (
          <Card key={agent.id} size="sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-mono text-xs tracking-wide uppercase">
                  {agent.name}
                </CardTitle>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {verdictLabel(agent.stance)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{agent.headline}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {agent.body}
              </p>
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                confidence {Math.round(agent.confidence)} · liq{" "}
                {formatUsd(report.pair.liquidityUsd)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="sr-only">{chief.headline}</p>
    </div>
  );
}
