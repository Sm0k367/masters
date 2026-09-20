import { AppShell } from "@/components/app-shell";
import { AgentsDesk } from "@/components/agents-desk";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function AgentsPage() {
  return (
    <AppShell>
      <Suspense fallback={<p className="font-mono text-xs text-muted-foreground">Loading desk…</p>}>
        <AgentsDesk />
      </Suspense>
    </AppShell>
  );
}
