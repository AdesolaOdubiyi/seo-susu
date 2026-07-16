import { NextRequest, NextResponse } from "next/server";
import { recordContribution } from "@/lib/db/contributions";
import { errorResponse, parseId, parseJsonBody, requireNumber } from "@/lib/http";

/**
 * POST /api/groups/:id/contribute
 * Mark a simulated contribution as sent for the current round.
 * Body: { userId }
 * When the last active member contributes, the round's payout is recorded
 * and the group advances to the next round (or next cycle).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(req);
    const result = recordContribution(
      parseId(id, "group id"),
      requireNumber(body, "userId"),
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
