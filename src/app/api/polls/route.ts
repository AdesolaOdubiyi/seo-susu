import { NextRequest, NextResponse } from "next/server";
import { createPoll, listPolls } from "@/lib/db/polls";
import { ChangeType } from "@/lib/db/types";
import {
  errorResponse,
  parseId,
  parseJsonBody,
  requireNumber,
  requireString,
} from "@/lib/http";

/**
 * POST /api/polls
 * Propose a group change requiring unanimous approval from eligible voters
 * (active members; a remove_member target can't veto their own removal).
 * Polls never block payouts.
 * Body: { groupId, proposedBy, changeType, changeDetails, deadline? }
 *   changeType: 'contribution_amount' | 'schedule' | 'add_member' | 'remove_member'
 *   changeDetails: { amount: 75 } | { schedule: "monthly" } |
 *     { userName: "Ama" } |
 *     { userId: 3, amount: 75, payoutDate: "..." } — removing a member
 *       requires proposing the group's new terms: the new payment amount
 *       and the new payout due date
 *   deadline: optional ISO date string (defaults to the next scheduled
 *     payment date)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody(req);
    const poll = createPoll({
      groupId: requireNumber(body, "groupId"),
      proposedBy: requireNumber(body, "proposedBy"),
      changeType: requireString(body, "changeType") as ChangeType,
      changeDetails: body.changeDetails,
      deadline: typeof body.deadline === "string" ? body.deadline : undefined,
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
