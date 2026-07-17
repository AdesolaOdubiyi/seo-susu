import { NextRequest, NextResponse } from "next/server";
import { signAgreement } from "@/lib/db/agreements";
import { errorResponse, parseId, parseJsonBody, requireNumber } from "@/lib/http";

/**
 * POST /api/groups/:id/agreement/sign
 * Sign the awaiting Group Agreement. Body: { userId }
 * When the last active member signs, the group moves to 'scheduled' (or
 * straight to 'live' if the agreed Round 1 date has arrived).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(req);
    const { agreement, group } = signAgreement(
      parseId(id, "group id"),
      requireNumber(body, "userId"),
    );
    return NextResponse.json({ agreement, group });
  } catch (err) {
    return errorResponse(err);
  }
}
