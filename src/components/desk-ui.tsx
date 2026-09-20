import { clsChange, formatPct, formatUsd } from "@/lib/format";
import type { HeatStat, MajorQuote } from "@/lib/types";

export function Ticker({
  majors,
  heat,
}: {
  majors: MajorQuote[];
  heat: HeatStat[];
}) {
  const items = [
    ...majors.map((item) => ({
      key: item.id,
      label: item.symbol,
      value: formatUsd(item.price),
      change: item.change24h,
    })),
    ...heat.slice(0, 3).map((item) => ({
      key: item.chain,
      label: `${item.label} vol`,
      value: formatUsd(item.volume24h),
      change: null as number | null,
    })),
  ];

  return (
    <div className="ticker-mask overflow-hidden rounded-lg border border-border bg-secondary/40">
      <div className="animate-ticker flex w-max gap-8 px-4 py-2 font-mono text-xs">
        {[...items, ...items].map((item, index) => (
          <div key={`${item.key}-${index}`} className="flex items-center gap-2">
            <span className="text-muted-foreground">{item.label}</span>
            <span>{item.value}</span>
            {item.change != null ? (
              <span className={clsChange(item.change)}>{formatPct(item.change)}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3">
      <div className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-1 font-heading text-xl tracking-tight">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      Not financial advice. Nothing in Robinhood Wallet is a reliable “will profit”
      play. New launches are high-risk gambling. Only use money you can lose
      completely, verify contract addresses yourself, and assume the average new
      token on this chain goes to zero.
    </p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-loss/30 bg-loss/5 px-4 py-6">
      <div className="font-medium text-loss">Tape is down</div>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm text-primary underline-offset-4 hover:underline"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Pulling the tape…" }: { label?: string }) {
  return (
    <div className="space-y-3">
      <div className="h-16 animate-pulse rounded-xl bg-secondary" />
      <div className="h-48 animate-pulse rounded-xl bg-secondary" />
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
