import { type NextRequest, NextResponse } from "next/server";
import { createPoll, listPolls } from "@/lib/db/polls";
import { type ChangeType } from "@/lib/db/types";
import {
  errorResponse,
  parseId,
  parseJsonBody,
  requireNumber,
  requireString,
} from "@/lib/http";

/**
 * POST /api/polls
 * Propose a change; unanimous approval among eligible voters required
 * (docs/CHANGE_RULES.md). Deadlines are set by the contract: setup and
 * start_cycle proposals get 7 days; live polls expire the day before the
 * round due date. Open polls block payout, never contributions.
 *
 * Body: { groupId, proposedBy, changeType, changeDetails }
 *   setup phase: 'contribution_amount' { amount } | 'schedule' { schedule } |
 *     'rotation_order' { orderedUserIds } | 'round1_start_date' { startDate? }
 *   live: 'contribution_amount' | 'schedule' | 'add_member' { userName } |
 *     'remove_member' { targetUserId, newAmount, newPayoutDate } |
 *     'start_cycle' {} (cycle complete only)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody(req);
    const poll = createPoll({
      groupId: requireNumber(body, "groupId"),
      proposedBy: requireNumber(body, "proposedBy"),
      changeType: requireString(body, "changeType") as ChangeType,
      changeDetails: body.changeDetails,
    });
    return NextResponse.json({ poll }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * GET /api/polls?groupId=N -> the group's polls (newest first) with votes.
 */
export async function GET(req: NextRequest) {
  try {
    const groupId = parseId(
      req.nextUrl.searchParams.get("groupId") ?? "",
      "groupId",
    );
    return NextResponse.json({ polls: listPolls(groupId) });
  } catch (err) {
    return errorResponse(err);
  }
}
