import { NextRequest, NextResponse } from "next/server";
import { createGroup, getGroup, getMembers, listGroups } from "@/lib/db/groups";
import { SCHEDULES, Schedule, ApiError } from "@/lib/db/types";
import {
  errorResponse,
  parseId,
  parseJsonBody,
  requireNumber,
  requireString,
} from "@/lib/http";

/**
 * POST /api/groups
 * Create a group. The creator is first in the rotation and may pre-register
 * the rest of the member list in rotation order (members later log in with
 * name + invite code).
 * Body: { name, contributionAmount, schedule, creatorName, memberNames? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody(req);
    const schedule = requireString(body, "schedule").toLowerCase() as Schedule;
    if (!SCHEDULES.includes(schedule)) {
      throw new ApiError(`"schedule" must be one of: ${SCHEDULES.join(", ")}`);
    }
    const contributionAmount = requireNumber(body, "contributionAmount");
    if (contributionAmount <= 0) {
      throw new ApiError('"contributionAmount" must be greater than 0');
    }
    if (
      body.memberNames !== undefined &&
      (!Array.isArray(body.memberNames) ||
        body.memberNames.some((n) => typeof n !== "string"))
    ) {
      throw new ApiError('"memberNames" must be an array of strings');
    }

    const { group, creator } = createGroup({
      name: requireString(body, "name"),
      contributionAmount,
      schedule,
      creatorName: requireString(body, "creatorName"),
      memberNames: body.memberNames as string[] | undefined,
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
