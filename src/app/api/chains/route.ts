import { getChainBoard } from "@/lib/markets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const board = await getChainBoard();
    return Response.json(board);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Board failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
