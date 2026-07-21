import { NextRequest, NextResponse } from "next/server";
import { generateReminders } from "@/lib/llm/reminders";
import { errorResponse, parseId } from "@/lib/http";

export const runtime = "nodejs";

/**
 * GET /api/groups/:id/reminders
 * Auto-generated nudges for active members who haven't marked their
 * contribution for the current round. Empty unless the group is live.
 *
 * Wording uses Groq when a key is configured and falls back to a built-in
 * template otherwise. Force one with ?ai=1 (Groq) or ?ai=0 (template);
 * `source` in the response says which was used.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const groupId = parseId(id, "group id");
    const ai = req.nextUrl.searchParams.get("ai");
    const opts =
      ai === "1" ? { useGroq: true } : ai === "0" ? { useGroq: false } : {};
    return NextResponse.json(await generateReminders(groupId, opts));
  } catch (err) {
    return errorResponse(err);
  }
}
