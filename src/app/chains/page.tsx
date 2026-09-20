import { ChainsBoard } from "@/components/chains-board";
import { getChainBoard } from "@/lib/markets";

export const dynamic = "force-dynamic";

export default async function ChainsPage() {
  let initial = null;
  try {
    initial = await getChainBoard();
  } catch (error) {
    console.error("chains", error);
  }
  return <ChainsBoard initial={initial} />;
}
