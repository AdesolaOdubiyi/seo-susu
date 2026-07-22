import { getDb } from "./index";
import {
  getActiveMembers,
  getCurrentRecipient,
  getMembers,
  requireActiveMember,
} from "./groups";
import {
  advanceRoundIfComplete,
  expireOverduePolls,
  listOpenPolls,
  type PayoutResult,
} from "./rotation";
import {
  getAcceptances,
  getCurrentAgreement,
  syncGroupPhase,
} from "./agreements";
import {
  calculatePot,
  canRecordContribution,
  canSettlePayout,
  isStalled,
} from "@/lib/rules";
import { ApiError, type ContributionRow } from "./types";

export interface ContributionResult {
  contribution: ContributionRow;
  /** Every active member has now contributed for this round. */
  roundComplete: boolean;
  /** Set when this contribution triggered the round's payout. */
  payout: PayoutResult | null;
  /** True when the round is fully paid but an open poll is blocking the payout. */
  waitingOnPoll: boolean;
}

const CONTRIBUTION_BLOCKED: Record<string, string> = {
  phase_setup: "The group is still setting terms. Agree on those first.",
  phase_awaiting_signatures:
    "The agreement is waiting for signatures. Contributions start after everyone signs and Round 1 begins.",
  phase_scheduled: "Round 1 has not started yet.",
  phase_cycle_complete:
    "This cycle is finished. Start the next cycle with a group vote.",
  need_two_active_members:
    "You need at least two active members before contributions can start.",
  already_contributed: "You already contributed for this round.",
};

/**
 * Record a simulated contribution for the current round, then advance the
 * rotation if the round is settled. Contributions stay open while votes are
 * open and after the due date. Only the payout waits.
 */
export function recordContribution(
  groupId: number,
  userId: number,
): ContributionResult {
  const db = getDb();

  return db.transaction(() => {
    const group = syncGroupPhase(groupId);
    requireActiveMember(groupId, userId);

    const already =
      db
        .prepare(
          `SELECT 1 FROM contributions
           WHERE group_id = ? AND user_id = ? AND cycle_number = ? AND round_number = ?`,
        )
        .get(groupId, userId, group.current_cycle, group.current_round) !==
      undefined;

    const allowed = canRecordContribution({
      phase: group.phase,
      activeMemberCount: getActiveMembers(groupId).length,
      alreadyContributedThisRound: already,
    });
    if (!allowed.ok) {
      throw new ApiError(
        CONTRIBUTION_BLOCKED[allowed.reason] ?? allowed.reason,
        409,
      );
    }

    db.prepare(
      `INSERT INTO contributions (group_id, user_id, cycle_number, round_number, status)
       VALUES (?, ?, ?, ?, 'confirmed')`,
    ).run(groupId, userId, group.current_cycle, group.current_round);

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

    return {
      contribution,
      roundComplete,
      payout,
      waitingOnPoll:
        roundComplete && payout === null && listOpenPolls(groupId).length > 0,
    };
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
    phase: string;
    contributionAmount: number;
    schedule: string;
    round1StartAt: string | null;
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
    /** Round due date once live; before that, the next date that matters
     *  (Round 1 start, signing deadline, or a placeholder a week out). */
    deadline: string;
    daysUntilDeadline: number;
    /** Past due with contributions still missing (status only, no penalty). */
    stalled: boolean;
    openPolls: number;
    payoutBlocked: boolean;
    payoutBlockedReason: string | null;
  };
  activeAgreement: {
    id: number;
    version: number;
    status: string;
    contentHash: string;
    signingDeadline: string | null;
    effectiveAt: string | null;
    signedBy: number[];
    renderedText: string;
  } | null;
}

/** Full snapshot for the status endpoint, dashboard, and chat grounding. */
export function getGroupStatus(groupId: number): GroupStatus {
  const group = syncGroupPhase(groupId);
  expireOverduePolls(groupId);

  const members = getMembers(groupId);
  const activeMembers = members.filter((m) => m.active === 1);
  const paidUserIds = new Set(
    getRoundContributions(groupId, group.current_cycle, group.current_round).map(
      (c) => c.user_id,
    ),
  );
  const allContributed = activeMembers.every((m) => paidUserIds.has(m.user_id));
  const recipient = getCurrentRecipient(group);
  const openPolls = listOpenPolls(groupId);
  const agreement = getCurrentAgreement(groupId);

  const live = group.phase === "live";
  const settle = canSettlePayout({
    activeMemberCount: activeMembers.length,
    allActiveContributed: allContributed,
    cycleComplete: group.phase === "cycle_complete",
    openPolls,
  });

  const deadline =
    group.round_due_at ??
    group.round1_start_at ??
    agreement?.signing_deadline ??
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const msLeft = new Date(deadline).getTime() - Date.now();

  return {
    group: {
      id: group.id,
      name: group.name,
      inviteCode: group.invite_code,
      phase: group.phase,
      contributionAmount: group.contribution_amount ?? 0,
      schedule: group.schedule ?? "",
      round1StartAt: group.round1_start_at,
      currentCycle: group.current_cycle,
      currentRound: group.current_round,
      cycleComplete: group.phase === "cycle_complete",
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
      potAmount: calculatePot(activeMembers.length, group.contribution_amount ?? 0),
      deadline,
      daysUntilDeadline: Math.ceil(msLeft / (24 * 60 * 60 * 1000)),
      stalled:
        live && group.round_due_at
          ? isStalled({
              roundDueAt: group.round_due_at,
              missingActiveContributions: !allContributed,
              cycleComplete: false,
            })
          : false,
      openPolls: openPolls.length,
      payoutBlocked: live && !settle.ok,
      payoutBlockedReason: live && !settle.ok ? settle.reason : null,
    },
    activeAgreement: agreement
      ? {
          id: agreement.id,
          version: agreement.version,
          status: agreement.status,
          contentHash: agreement.content_hash,
          signingDeadline: agreement.signing_deadline,
          effectiveAt: agreement.effective_at,
          signedBy: getAcceptances(agreement.id).map((a) => a.user_id),
          renderedText: agreement.rendered_text,
        }
      : null,
  };
}
