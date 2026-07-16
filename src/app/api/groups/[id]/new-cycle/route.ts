import { NextRequest, NextResponse } from "next/server";
import { startNewCycle } from "@/lib/db/rotation";
import { errorResponse, parseId, parseJsonBody, requireNumber } from "@/lib/http";

/**
 * POST /api/groups/:id/new-cycle
 * Once every member has received a payout the cycle ends (the group stays
 * intact). Any active member can start the next cycle. Body: { userId }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(req);
    const group = startNewCycle(parseId(id, "group id"), requireNumber(body, "userId"));
    return NextResponse.json({ group });
  } catch (err) {
    return errorResponse(err);
  }
}
