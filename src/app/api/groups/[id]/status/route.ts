import { type NextRequest, NextResponse } from "next/server";
import { getGroupStatus } from "@/lib/db/contributions";
import { errorResponse, parseId } from "@/lib/http";

/**
 * GET /api/groups/:id/status
 * Rotation order, per-member contribution state for the current round,
 * current payout recipient, and round/cycle progress.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return NextResponse.json(getGroupStatus(parseId(id, "group id")));
  } catch (err) {
    return errorResponse(err);
  }
}
