import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { createGroup, joinGroup, getActiveMembers } from "@/lib/db/groups";
import { createPoll, votePoll } from "@/lib/db/polls";
import { signAgreement, syncGroupPhase } from "@/lib/db/agreements";
import { recordContribution, getGroupStatus } from "@/lib/db/contributions";
import type { ChangeType } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * POST /api/dev/seed  (dev only)
 *
 * Drives a brand-new group through the *real* lifecycle to a live, mid-round
 * state so the dashboard has something to show without hand-walking setup:
 *   create → 3 members join → unanimous setup polls (amount, cadence,
 *   rotation, Round 1 date) → all sign → backdate Round 1 → live → two of
 *   four members have contributed.
 *
 * Returns the group id and members (with userIds) so the UI can act as any
 * of them. Each call creates a fresh group.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const db = getDb();
  const memberNames = ["Ama", "Kofi", "Zainab", "Malik"];

  // 1. Organizer creates the group; everyone else joins by invite code.
  const { group, creator } = createGroup({
    name: "Sunday Savers",
    creatorName: memberNames[0],
  });
  for (const name of memberNames.slice(1)) {
    joinGroup({ inviteCode: group.invite_code, userName: name });
  }

  const members = getActiveMembers(group.id);
  const orderedUserIds = members.map((m) => m.user_id);
  const proposer = creator.id;

  // 2. Unanimously approve the four setup terms. Each poll is created by the
  //    organizer and approved by every active member.
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const setupPolls: Array<{ changeType: ChangeType; changeDetails: unknown }> = [
    { changeType: "contribution_amount", changeDetails: { amount: 50 } },
    { changeType: "schedule", changeDetails: { schedule: "weekly" } },
    { changeType: "rotation_order", changeDetails: { orderedUserIds } },
    { changeType: "round1_start_date", changeDetails: { startDate: tomorrow } },
  ];
  for (const p of setupPolls) {
    const poll = createPoll({ groupId: group.id, proposedBy: proposer, ...p });
    for (const uid of orderedUserIds) {
      votePoll(poll.id, uid, true);
    }
  }

  // 3. Everyone signs the generated agreement -> phase becomes 'scheduled'.
  for (const uid of orderedUserIds) {
    signAgreement(group.id, uid);
  }

  // 4. Backdate Round 1 to yesterday so the lazy phase sync flips us to live.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.prepare("UPDATE groups SET round1_start_at = ? WHERE id = ?").run(
    yesterday,
    group.id,
  );
  syncGroupPhase(group.id);

  // 5. Two of four contribute so the dashboard opens mid-round.
  recordContribution(group.id, orderedUserIds[1]); // Kofi
  recordContribution(group.id, orderedUserIds[2]); // Zainab

  const status = getGroupStatus(group.id);

  return NextResponse.json({
    groupId: group.id,
    inviteCode: group.invite_code,
    members: members.map((m) => ({ userId: m.user_id, name: m.name })),
    status,
  });
}
