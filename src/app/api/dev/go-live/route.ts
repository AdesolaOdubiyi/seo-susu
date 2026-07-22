import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { syncGroupPhase } from "@/lib/db/agreements";
import { getGroupStatus } from "@/lib/db/contributions";
import { parseId, parseJsonBody, requireNumber } from "@/lib/http";

export const runtime = "nodejs";

/**
 * POST /api/dev/go-live  (dev only)
 * Backdate a scheduled group's Round 1 start to just now so the lazy phase
 * sync flips it to 'live' immediately - lets a real setup walkthrough reach
 * the live dashboard in a demo without waiting for the agreed date.
 * Body: { groupId }
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const body = await parseJsonBody(req);
  const groupId = parseId(String(requireNumber(body, "groupId")), "group id");

  getDb()
    .prepare("UPDATE groups SET round1_start_at = ? WHERE id = ?")
    .run(new Date(Date.now() - 60 * 1000).toISOString(), groupId);
  syncGroupPhase(groupId);

  return NextResponse.json({ status: getGroupStatus(groupId) });
}
