import { getGroupStatus, type GroupStatus } from "@/lib/db/contributions";
import { getDb } from "@/lib/db";
import type { Cadence, OpenPollSummary } from "@/lib/rules";
import { canSettlePayout } from "@/lib/rules";
import type { LiveGroupStatus } from "./types";

function asCadence(schedule: string): Cadence {
  if (schedule === "weekly" || schedule === "biweekly" || schedule === "monthly") {
    return schedule;
  }
  return "weekly";
}

function listOpenPolls(groupId: number): OpenPollSummary[] {
  return getDb()
    .prepare(
      `SELECT id, change_type AS changeType, deadline, status
       FROM polls
       WHERE group_id = ? AND status = 'open'
       ORDER BY id`,
    )
    .all(groupId) as OpenPollSummary[];
}

/** Map DB group status into the LLM LiveGroupStatus shape. */
export function toLiveGroupStatus(
  status: GroupStatus,
  openPolls: OpenPollSummary[],
  now: Date = new Date(),
): LiveGroupStatus {
  const activeCount = status.members.filter((m) => m.active).length;
  const allContributed = status.members
    .filter((m) => m.active)
    .every((m) => m.contributedThisRound);

  const settle = canSettlePayout({
    activeMemberCount: activeCount,
    allActiveContributed: allContributed,
    cycleComplete: status.group.cycleComplete,
    openPolls,
    now,
  });

  const payoutBlocked = !settle.ok && settle.reason.startsWith("open_poll");
  // Also block display when open polls exist even if contributions incomplete
  const openBlocking = openPolls.length > 0;
  const blocked = payoutBlocked || openBlocking;

  return {
    groupId: status.group.id,
    groupName: status.group.name,
    phase: status.group.cycleComplete ? "cycle_complete" : "live",
    contributionAmount: status.group.contributionAmount,
    cadence: asCadence(status.group.schedule),
    currentCycle: status.group.currentCycle,
    currentRound: status.group.currentRound,
    roundDueAt: status.round.deadline,
    pot: status.round.potAmount,
    stalled: status.round.stalled,
    payoutBlocked: blocked,
    payoutBlockedReason: blocked
      ? payoutBlocked
        ? settle.reason
        : `open_poll:${openPolls.map((p) => p.id).join(",")}`
      : null,
    nextRecipient: status.currentRecipient,
    members: status.members.map((m) => ({
      userId: m.userId,
      name: m.name,
      rotationPosition: m.rotationPosition,
      active: m.active,
      payoutReceivedThisCycle: m.payoutReceived,
      contributedThisRound: m.contributedThisRound,
    })),
    openPolls,
  };
}

/**
 * Load live status for chat. Agreement tables are not wired yet → null agreement
 * is handled by buildChatContext.
 */
export function loadLiveGroupStatus(groupId: number): LiveGroupStatus {
  const status = getGroupStatus(groupId);
  const openPolls = listOpenPolls(groupId);
  return toLiveGroupStatus(status, openPolls);
}
