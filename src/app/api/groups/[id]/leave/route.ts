import { type NextRequest, NextResponse } from "next/server";
import { leaveGroup } from "@/lib/db/groups";
import { advanceRoundIfComplete } from "@/lib/db/rotation";
import { errorResponse, parseId, parseJsonBody, requireNumber } from "@/lib/http";

/**
 * POST /api/groups/:id/leave
 * Drop out of the rotation. The pot for future rounds shrinks to
 * (active members x contribution amount). Body: { userId }
 * Leaving can settle the current round (one fewer contribution owed), so the
 * rotation is re-checked and any resulting payout is returned.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const groupId = parseId(id, "group id");
    const body = await parseJsonBody(req);
    leaveGroup(groupId, requireNumber(body, "userId"));
    const payout = advanceRoundIfComplete(groupId);
    return NextResponse.json({ left: true, payout });
  } catch (err) {
    return errorResponse(err);
  }
}
