import { DailyBoard } from "@/components/daily-board";
import { getDailyBrief } from "@/lib/markets";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
  let initial = null;
  try {
    initial = await getDailyBrief();
  } catch (error) {
    console.error("daily brief", error);
  }
  return <DailyBoard initial={initial} />;
}
