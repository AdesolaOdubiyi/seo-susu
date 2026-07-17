import { NextRequest, NextResponse } from "next/server";
import { createGroup, getGroup, getMembers, listGroups } from "@/lib/db/groups";
import {
  errorResponse,
  parseId,
  parseJsonBody,
  requireString,
} from "@/lib/http";

/**
 * POST /api/groups
 * Organizer creates an empty group in the 'setup' phase and shares the
 * invite code. Terms (amount, cadence, rotation order, Round 1 date) are
 * agreed later via unanimous setup proposals on /api/polls — the organizer
 * has no special powers beyond opening setup.
 * Body: { name, creatorName }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody(req);
    const { group, creator } = createGroup({
      name: requireString(body, "name"),
      creatorName: requireString(body, "creatorName"),
    });
    return NextResponse.json(
      { group, creator, inviteCode: group.invite_code },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * GET /api/groups        -> list all groups with member counts
 * GET /api/groups?id=N   -> single group with its members
 */
export async function GET(req: NextRequest) {
  try {
    const idParam = req.nextUrl.searchParams.get("id");
    if (idParam !== null) {
      const id = parseId(idParam, "group id");
      return NextResponse.json({ group: getGroup(id), members: getMembers(id) });
    }
    return NextResponse.json({ groups: listGroups() });
  } catch (err) {
    return errorResponse(err);
  }
}
