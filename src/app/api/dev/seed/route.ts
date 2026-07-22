import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { createGroup, joinGroup, getActiveMembers } from "@/lib/db/groups";
import { createPoll, votePoll } from "@/lib/db/polls";
import { signAgreement, syncGroupPhase } from "@/lib/db/agreements";
import { recordContribution, getGroupStatus } from "@/lib/db/contributions";
import type { ChangeType } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * POST /api/dev/seed (dev only)
 *
 * Runs the real setup path into a live mid-round group:
 * create, join, unanimous setup votes, signatures, backdated Round 1,
 * then two of four contributions.
 *
 * Response includes groupId and members so the UI can switch identities.
 * Each call creates a new group.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const db = getDb();
  const memberNames = ["Ama", "Kofi", "Zainab", "Malik"] as const;
  const organizerName = memberNames[0];

  const { group, creator } = createGroup({
    name: "Sunday Savers",
    creatorName: organizerName,
  });
  for (const name of memberNames.slice(1)) {
    joinGroup({ inviteCode: group.invite_code, userName: name });
  }

  const members = getActiveMembers(group.id);
  const orderedUserIds = members.map((m) => m.user_id);
  const proposer = creator.id;
  const contributorA = orderedUserIds[1];
  const contributorB = orderedUserIds[2];
  if (contributorA === undefined || contributorB === undefined) {
    return NextResponse.json(
      { error: "Seed expected at least three members" },
      { status: 500 },
    );
  }

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

  for (const uid of orderedUserIds) {
    signAgreement(group.id, uid);
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  db.prepare("UPDATE groups SET round1_start_at = ? WHERE id = ?").run(
    yesterday,
    group.id,
  );
  syncGroupPhase(group.id);

  recordContribution(group.id, contributorA);
  recordContribution(group.id, contributorB);

  const status = getGroupStatus(group.id);

  return NextResponse.json({
    groupId: group.id,
    inviteCode: group.invite_code,
    members: members.map((m) => ({ userId: m.user_id, name: m.name })),
    status,
  });
}
