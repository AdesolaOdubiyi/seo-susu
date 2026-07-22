import { type NextRequest, NextResponse } from "next/server";
import { joinGroup } from "@/lib/db/groups";
import { errorResponse, parseJsonBody, requireString } from "@/lib/http";

/**
 * POST /api/groups/join
 * Name + invite code auth. Logs in if the name matches an existing member
 * (200); otherwise joins the group at the end of the rotation (201) - only
 * possible before the rotation starts. Body: { inviteCode, userName }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody(req);
    const { group, user, joined } = joinGroup({
      inviteCode: requireString(body, "inviteCode"),
      userName: requireString(body, "userName"),
    });
    return NextResponse.json({ group, user, joined }, { status: joined ? 201 : 200 });
  } catch (err) {
    return errorResponse(err);
  }
}
