import { NextRequest, NextResponse } from "next/server";
import {
  getAcceptances,
  getCurrentAgreement,
  listAgreements,
  regenerateAgreement,
} from "@/lib/db/agreements";
import { errorResponse, parseId, parseJsonBody, requireNumber } from "@/lib/http";

/**
 * GET /api/groups/:id/agreement
 * The current Group Agreement (structured terms + rendered plain-language
 * text + who signed) and the full version history.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const groupId = parseId(id, "group id");
    const history = listAgreements(groupId);
    const current = getCurrentAgreement(groupId);
    return NextResponse.json({
      current: current
        ? {
            ...current,
            terms: JSON.parse(current.terms_json),
            signedBy: getAcceptances(current.id).map((a) => a.user_id),
          }
        : null,
      history: history.map((a) => ({
        id: a.id,
        version: a.version,
        status: a.status,
        generated_at: a.generated_at,
        effective_at: a.effective_at,
        supersedes_id: a.supersedes_id,
      })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/groups/:id/agreement
 * Re-issue the agreement after a 7-day signing window expired back to
 * setup. Body: { userId }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await parseJsonBody(req);
    const agreement = regenerateAgreement(
      parseId(id, "group id"),
      requireNumber(body, "userId"),
    );
    return NextResponse.json({ agreement }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
