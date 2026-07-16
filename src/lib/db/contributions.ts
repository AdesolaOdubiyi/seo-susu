import { getDb } from "./index";
import {
  getActiveMembers,
  getCurrentRecipient,
  getGroup,
  getMembers,
  requireActiveMember,
} from "./groups";
import {
  advanceRoundIfComplete,
  getRoundDeadline,
  PayoutResult,
} from "./rotation";
import { ApiError, ContributionRow } from "./types";

export interface ContributionResult {
  contribution: ContributionRow;
  /** Every active member has now contributed for this round. */
  roundComplete: boolean;
  /** Set when this contribution triggered the round's payout. */
  payout: PayoutResult | null;
}

/**
 * Mark a simulated contribution as sent for the group's current round, then
 * advance the rotation if that settled the round.
 */
export function recordContribution(
  groupId: number,
  userId: number,
): ContributionResult {
  const db = getDb();

  return db.transaction(() => {
    const group = getGroup(groupId);
    requireActiveMember(groupId, userId);

    if (group.cycle_complete === 1) {
      throw new ApiError(
        "This cycle is complete — start a new cycle before contributing",
        409,
      );
    }
    if (getActiveMembers(groupId).length < 2) {
      throw new ApiError(
        "The rotation needs at least 2 active members before contributions can start",
        409,
      );
    }

    try {
      db.prepare(
        `INSERT INTO contributions (group_id, user_id, cycle_number, round_number, status)
         VALUES (?, ?, ?, ?, 'confirmed')`,
      ).run(groupId, userId, group.current_cycle, group.current_round);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("UNIQUE constraint failed")
      ) {
        throw new ApiError("Already contributed for this round", 409);
      }
      throw err;
    }

    const contribution = db
      .prepare(
        `SELECT * FROM contributions
         WHERE group_id = ? AND user_id = ? AND cycle_number = ? AND round_number = ?`,
      )
      .get(groupId, userId, group.current_cycle, group.current_round) as ContributionRow;

    const payout = advanceRoundIfComplete(groupId);
    const paidUserIds = new Set(
      getRoundContributions(groupId, group.current_cycle, group.current_round).map(
        (c) => c.user_id,
      ),
    );
    const roundComplete = getActiveMembers(groupId).every((m) =>
      paidUserIds.has(m.user_id),
    );

    return { contribution, roundComplete, payout };
  })();
}

export function getRoundContributions(
  groupId: number,
  cycle: number,
  round: number,
): ContributionRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM contributions
       WHERE group_id = ? AND cycle_number = ? AND round_number = ?
       ORDER BY timestamp`,
    )
    .all(groupId, cycle, round) as ContributionRow[];
}

export interface GroupStatus {
  group: {
    id: number;
    name: string;
    inviteCode: string;
    contributionAmount: number;
    schedule: string;
    currentCycle: number;
    currentRound: number;
    cycleComplete: boolean;
  };
  members: Array<{
    userId: number;
    name: string;
    rotationPosition: number;
    active: boolean;
    payoutReceived: boolean;
    contributedThisRound: boolean;
  }>;
  currentRecipient: { userId: number; name: string } | null;
  round: {
    contributed: number;
    expected: number;
    potAmount: number;
    deadline: string;
    daysUntilDeadline: number;
    /** Past deadline with contributions still missing. */
    stalled: boolean;
    openPolls: number;
  };
}

/** Full rotation/contribution snapshot for the status endpoint (and chat grounding). */
export function getGroupStatus(groupId: number): GroupStatus {
  const group = getGroup(groupId);
  const members = getMembers(groupId);
  const activeMembers = members.filter((m) => m.active === 1);
  const paidUserIds = new Set(
    getRoundContributions(groupId, group.current_cycle, group.current_round).map(
      (c) => c.user_id,
    ),
  );
  const recipient = getCurrentRecipient(group);

  const deadline = getRoundDeadline(group);
  const msLeft = deadline.getTime() - Date.now();
  const allContributed = activeMembers.every((m) => paidUserIds.has(m.user_id));
  const openPolls = (
    getDb()
      .prepare(
        "SELECT COUNT(*) AS n FROM polls WHERE group_id = ? AND status = 'open'",
      )
      .get(groupId) as { n: number }
  ).n;
  const stalled = group.cycle_complete !== 1 && msLeft < 0 && !allContributed;

  return {
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.invite_code,
      contributionAmount: group.contribution_amount,
      schedule: group.schedule,
      currentCycle: group.current_cycle,
      currentRound: group.current_round,
      cycleComplete: group.cycle_complete === 1,
    },
    members: members.map((m) => ({
      userId: m.user_id,
      name: m.name,
      rotationPosition: m.rotation_position,
      active: m.active === 1,
      payoutReceived: m.payout_received === 1,
      contributedThisRound: paidUserIds.has(m.user_id),
    })),
    currentRecipient: recipient
      ? { userId: recipient.user_id, name: recipient.name }
      : null,
    round: {
      contributed: activeMembers.filter((m) => paidUserIds.has(m.user_id)).length,
      expected: activeMembers.length,
      potAmount: group.contribution_amount * activeMembers.length,
      deadline: deadline.toISOString(),
      daysUntilDeadline: Math.ceil(msLeft / (24 * 60 * 60 * 1000)),
      stalled,
      openPolls,
    },
  };
}
