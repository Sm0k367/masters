import { AppShell } from "@/components/app-shell";
import { LiveDesk } from "@/components/live-desk";
import { loadLiveTick } from "@/lib/live-store";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

async function seedTick() {
  try {
    return await loadLiveTick();
  } catch {
    return null;
  }
}

export default async function LivePage() {
  const initial = await seedTick();
  return (
    <AppShell>
      <Suspense
        fallback={
          <p className="font-mono text-xs text-muted-foreground">
            Live agent is reading tape…
          </p>
        }
      >
        <LiveDesk initial={initial} />
      </Suspense>
    </AppShell>
  );
}
