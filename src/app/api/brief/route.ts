import { getDailyBrief } from "@/lib/markets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const brief = await getDailyBrief();
    return Response.json(brief);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Brief failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
