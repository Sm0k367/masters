const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 2,
});

const usdFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export function formatUsd(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "$0";
  if (abs >= 1_000) return `$${compact.format(value)}`;
  if (abs >= 1) return usdFull.format(value);
  if (abs >= 0.01) return `$${value.toFixed(digits)}`;
  return `$${value.toPrecision(3)}`;
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (Math.abs(value) >= 1000) return compact.format(value);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  if (Math.abs(value) >= 1000) return `${sign}${compact.format(value)}%`;
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatAge(ageMs: number | null | undefined): string {
  if (ageMs == null || ageMs < 0) return "—";
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 21) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function shortAddress(address: string, size = 4): string {
  if (!address) return "—";
  if (address.length <= size * 2 + 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function clsChange(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value) || value === 0) return "text-muted-foreground";
  return value > 0 ? "text-gain" : "text-loss";
}

export function ageMinutes(ageMs: number | null | undefined): number | null {
  if (ageMs == null) return null;
  return ageMs / 60_000;
}
