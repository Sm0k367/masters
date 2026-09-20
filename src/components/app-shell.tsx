"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  Activity,
  BookOpen,
  Crosshair,
  LayoutGrid,
  Radar,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const NAV = [
  { href: "/", label: "Daily", icon: Activity },
  { href: "/scan", label: "Scan", icon: Radar },
  { href: "/agents", label: "Agents", icon: Terminal },
  { href: "/diligence", label: "60s check", icon: ShieldCheck },
  { href: "/chains", label: "All chains", icon: LayoutGrid },
  { href: "/cockpit", label: "Cockpit", icon: Crosshair },
  { href: "/journal", label: "Journal", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/diligence?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-sidebar lg:flex lg:flex-col">
        <div className="border-b border-border px-4 py-4">
          <Link href="/" className="block">
            <div className="font-heading text-lg tracking-tight">Masters</div>
            <div className="font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
              All-chain desk
            </div>
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3 font-mono text-[10px] leading-relaxed text-muted-foreground">
          Chain 4663 · Pons launches · Uniswap size
          <br />
          Not financial advice.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/85 px-3 py-2 backdrop-blur-md">
          <Link href="/" className="lg:hidden">
            <div className="font-heading text-base">Masters</div>
          </Link>
          <form onSubmit={onSearch} className="flex min-w-0 flex-1 items-center gap-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Paste contract or ticker — 60s checklist"
              className="font-mono text-xs"
            />
            <Button type="submit" size="sm">
              Run
            </Button>
          </form>
          <div className="hidden font-mono text-[10px] tracking-wide text-muted-foreground uppercase sm:block">
            Live tape
          </div>
        </header>
        <main className="flex-1 px-3 py-4 sm:px-6 sm:py-6">{children}</main>
        <nav className="sticky bottom-0 z-20 grid grid-cols-4 gap-1 border-t border-border bg-background/95 p-1 lg:hidden">
          {NAV.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md py-1.5 text-[10px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
