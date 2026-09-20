import { ScanBoard } from "@/components/scan-board";
import { getScan } from "@/lib/markets";

export const dynamic = "force-dynamic";

export default async function ScanPage() {
  let initial = null;
  try {
    initial = await getScan("robinhood");
  } catch (error) {
    console.error("scan", error);
  }
  return <ScanBoard initial={initial} />;
}
