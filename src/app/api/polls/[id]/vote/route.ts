import { NextRequest, NextResponse } from "next/server";
import { votePoll } from "@/lib/db/polls";
import { ApiError } from "@/lib/db/types";
import { errorResponse, parseId, parseJsonBody, requireNumber } from "@/lib/http";

/**
 * POST /api/polls/:id/vote
 * Body: { userId, vote: boolean }
 * Any rejection closes the poll; unanimous approval applies the change.
 * If the approved change settles the current round (e.g. removing a
 * non-payer), the triggered payout is returned alongside the poll.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(req);
    if (typeof body.vote !== "boolean") {
      throw new ApiError('"vote" is required and must be a boolean');
    }
    const { poll, payout } = votePoll(
      parseId(id, "poll id"),
      requireNumber(body, "userId"),
      body.vote,
    );
    return NextResponse.json({ poll, payout });
  } catch (err) {
    return errorResponse(err);
  }
}
