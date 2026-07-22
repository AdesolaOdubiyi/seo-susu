import { type NextRequest, NextResponse } from "next/server";
import { askSusu } from "@/lib/llm/chat";
import {
  errorResponse,
  parseJsonBody,
  requireNumber,
  requireString,
} from "@/lib/http";

export const runtime = "nodejs";

/**
 * POST /api/chat
 * Body: { groupId: number, userId: number, message: string }
 *
 * MVP auth: userId must be an active member of the group.
 * Agreement snapshots are null until backend adds group_agreements.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await parseJsonBody(req);
    const groupId = requireNumber(body, "groupId");
    const userId = requireNumber(body, "userId");
    const message = requireString(body, "message");

    if (!Number.isInteger(groupId) || groupId <= 0) {
      return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
    }
    if (!Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const result = await askSusu({ groupId, userId, message });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
