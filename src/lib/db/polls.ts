import { getDb } from "./index";
import {
  addMember,
  getActiveMembers,
  getMembers,
  requireActiveMember,
} from "./groups";
import {
  advanceRoundIfComplete,
  beginNextCycle,
  expireOverduePolls,
  PayoutResult,
} from "./rotation";
import {
  generateAgreement,
  getAcceptances,
  getCurrentAgreement,
  getSetupApprovals,
  recordAcceptance,
  snapshotAgreement,
  syncGroupPhase,
} from "./agreements";
import {
  canCompleteStartCycle,
  canGenerateAgreement,
  canProposeStartCycle,
  defaultRound1StartDate,
  eligibleVotersForRemove,
  pollDeadlineDayBefore,
  proposalExpiresAt,
  validateRemoveMemberDetails,
  validateRotationOrder,
} from "@/lib/rules";
import {
  ApiError,
  ChangeType,
  GroupRow,
  LIVE_POLL_TYPES,
  PollRow,
  PollVoteRow,
  SCHEDULES,
  Schedule,
  SETUP_POLL_TYPES,
} from "./types";

export interface PollWithVotes extends PollRow {
  proposed_by_name: string;
  votes: Array<{ userId: number; name: string; vote: boolean }>;
  approvals: number;
  votesNeeded: number;
}

/**
 * Propose a change. During setup these are the four setup proposals
 * (amount, cadence, rotation order, Round 1 date; 7-day deadline). Once
 * live they are group-term changes (deadline = the day before the round is
 * due; expired polls auto-reject). Unanimous approval among eligible voters
 * either way. Open polls block payout, never contributions.
 */
export function createPoll(input: {
  groupId: number;
  proposedBy: number;
  changeType: ChangeType;
  changeDetails: unknown;
}): PollWithVotes {
  const db = getDb();

  return db.transaction(() => {
    const group = syncGroupPhase(input.groupId);
    expireOverduePolls(input.groupId);
    requireActiveMember(input.groupId, input.proposedBy);

    const details = normalizeDetails(group, input.changeType, input.changeDetails);
    const deadline = pollDeadline(group, input.changeType);

    const pollId = db
      .prepare(
        `INSERT INTO polls (group_id, proposed_by, change_type, change_details, deadline, status)
         VALUES (?, ?, ?, ?, ?, 'open')`,
      )
      .run(
        input.groupId,
        input.proposedBy,
        input.changeType,
        JSON.stringify(details),
        deadline.toISOString(),
      ).lastInsertRowid as number;

    return getPoll(pollId);
  })();
}

function pollDeadline(group: GroupRow, changeType: ChangeType): Date {
  // Live polls: the UTC calendar day before the round due date — unless
  // that is already past (stalled round), where a born-expired poll would
  // make the deadlock unfixable; fall back to the 7-day proposal window.
  if (group.phase === "live" && group.round_due_at && changeType !== "start_cycle") {
    const dayBefore = pollDeadlineDayBefore(group.round_due_at);
    if (dayBefore.getTime() > Date.now()) return dayBefore;
  }
  // Setup proposals and start_cycle renewals: 7 days.
  return proposalExpiresAt(new Date(), 7);
}

/** Validate + normalize changeDetails for the group's phase. Throws ApiError. */
function normalizeDetails(
  group: GroupRow,
  changeType: ChangeType,
  raw: unknown,
): Record<string, unknown> {
  const obj = (raw ?? {}) as Record<string, unknown>;

  if (group.phase === "setup") {
    if (!(SETUP_POLL_TYPES as readonly string[]).includes(changeType)) {
      throw new ApiError(
        `During setup, changeType must be one of: ${SETUP_POLL_TYPES.join(", ")}`,
      );
    }
    switch (changeType) {
      case "contribution_amount":
        return { amount: requireAmount(obj) };
      case "schedule":
        return { schedule: requireSchedule(obj) };
      case "rotation_order": {
        const ids = obj.orderedUserIds;
        if (!Array.isArray(ids) || ids.some((n) => typeof n !== "number")) {
          throw new ApiError(
            'changeDetails must include "orderedUserIds", the full payout order as an array of member userIds',
          );
        }
        const valid = validateRotationOrder(
          ids as number[],
          getActiveMembers(group.id).map((m) => m.user_id),
        );
        if (!valid.ok) {
          throw new ApiError(`Invalid rotation order: ${valid.reason}`);
        }
        return { orderedUserIds: ids };
      }
      case "round1_start_date": {
        const startDate =
          typeof obj.startDate === "string"
            ? new Date(obj.startDate)
            : defaultRound1StartDate();
        if (Number.isNaN(startDate.getTime())) {
          throw new ApiError('"startDate" must be an ISO date string');
        }
        if (startDate.getTime() <= Date.now()) {
          throw new ApiError('"startDate" must be in the future');
        }
        return { startDate: startDate.toISOString() };
      }
      default:
        throw new ApiError(`Unsupported setup proposal: ${changeType}`);
    }
  }

  if (group.phase === "awaiting_signatures" || group.phase === "scheduled") {
    throw new ApiError(
      `No polls while the agreement is being ${group.phase === "scheduled" ? "scheduled" : "signed"} — it expires back to setup after 7 days if signatures stall`,
      409,
    );
  }

  if (!(LIVE_POLL_TYPES as readonly string[]).includes(changeType)) {
    throw new ApiError(
      `changeType must be one of: ${LIVE_POLL_TYPES.join(", ")}`,
    );
  }
  switch (changeType) {
    case "contribution_amount":
      return { amount: requireAmount(obj) };
    case "schedule":
      return { schedule: requireSchedule(obj) };
    case "add_member": {
      if (typeof obj.userName !== "string" || obj.userName.trim() === "") {
        throw new ApiError('changeDetails must include a non-empty "userName"');
      }
      const taken = getMembers(group.id).some(
        (m) =>
          m.name.toLowerCase() === (obj.userName as string).trim().toLowerCase(),
      );
      if (taken) {
        throw new ApiError("A member with that name already exists in this group");
      }
      return { userName: (obj.userName as string).trim() };
    }
    case "remove_member": {
      const details = {
        targetUserId: obj.targetUserId as number,
        newAmount: obj.newAmount as number,
        newPayoutDate: obj.newPayoutDate as string,
      };
      const valid = validateRemoveMemberDetails(details);
      if (!valid.ok) {
        throw new ApiError(
          `Removing a member needs "targetUserId", the new payment "newAmount", and the new "newPayoutDate" (${valid.reason})`,
        );
      }
      if (
        !getActiveMembers(group.id).some((m) => m.user_id === details.targetUserId)
      ) {
        throw new ApiError("That user is not an active member of this group");
      }
      return { ...details };
    }
    case "start_cycle": {
      const can = canProposeStartCycle({
        cycleComplete: group.phase === "cycle_complete",
        proposerIsActive: true,
      });
      if (!can.ok) {
        throw new ApiError(
          "start_cycle can only be proposed once the current cycle is complete",
          409,
        );
      }
      return {};
    }
    default:
      throw new ApiError(`Unsupported changeType: ${changeType}`);
  }
}

function requireAmount(obj: Record<string, unknown>): number {
  if (typeof obj.amount !== "number" || obj.amount <= 0) {
    throw new ApiError('changeDetails must include a positive "amount" number');
  }
  return obj.amount;
}

function requireSchedule(obj: Record<string, unknown>): Schedule {
  if (!SCHEDULES.includes(obj.schedule as Schedule)) {
    throw new ApiError(
      `changeDetails.schedule must be one of: ${SCHEDULES.join(", ")}`,
    );
  }
  return obj.schedule as Schedule;
}

export function getPoll(pollId: number): PollWithVotes {
  const db = getDb();
  const poll = db.prepare(
    `SELECT p.*, u.name AS proposed_by_name
     FROM polls p JOIN users u ON u.id = p.proposed_by
     WHERE p.id = ?`,
  ).get(pollId) as (PollRow & { proposed_by_name: string }) | undefined;
  if (!poll) throw new ApiError("Poll not found", 404);

  const votes = db
    .prepare(
      `SELECT pv.*, u.name
       FROM poll_votes pv JOIN users u ON u.id = pv.user_id
       WHERE pv.poll_id = ?`,
    )
    .all(pollId) as Array<PollVoteRow & { name: string }>;

  return {
    ...poll,
    votes: votes.map((v) => ({
      userId: v.user_id,
      name: v.name,
      vote: v.vote === 1,
    })),
    approvals: votes.filter((v) => v.vote === 1).length,
    votesNeeded: eligibleVoterIds(poll).length,
  };
}

export function listPolls(groupId: number): PollWithVotes[] {
  syncGroupPhase(groupId);
  expireOverduePolls(groupId);
  const ids = getDb()
    .prepare("SELECT id FROM polls WHERE group_id = ? ORDER BY id DESC")
    .all(groupId) as Array<{ id: number }>;
  return ids.map(({ id }) => getPoll(id));
}

/**
 * Who must approve: every active member, except that a remove_member target
 * cannot vote on (or veto) their own removal.
 */
function eligibleVoterIds(poll: PollRow): number[] {
  const activeIds = getActiveMembers(poll.group_id).map((m) => m.user_id);
  if (poll.change_type !== "remove_member") return activeIds;
  const { targetUserId } = JSON.parse(poll.change_details) as {
    targetUserId: number;
  };
  return eligibleVotersForRemove(activeIds, targetUserId);
}

/**
 * Record a vote. Any rejection settles the poll as rejected; unanimous
 * approval applies the change. A yes on start_cycle also records acceptance
 * of the current agreement version — the next cycle begins only when every
 * active member has both approved and accepted. Settling a poll can unblock
 * a waiting payout, which is returned when triggered.
 */
export function votePoll(
  pollId: number,
  userId: number,
  vote: boolean,
): { poll: PollWithVotes; payout: PayoutResult | null } {
  const db = getDb();

  return db.transaction(() => {
    const found = db.prepare("SELECT * FROM polls WHERE id = ?").get(pollId) as
      | PollRow
      | undefined;
    if (!found) throw new ApiError("Poll not found", 404);
    syncGroupPhase(found.group_id);
    expireOverduePolls(found.group_id);

    const poll = db.prepare("SELECT * FROM polls WHERE id = ?").get(pollId) as PollRow;
    if (poll.status !== "open") {
      throw new ApiError(
        `This poll is already ${poll.status} (expired polls auto-reject)`,
        409,
      );
    }
    requireActiveMember(poll.group_id, userId);
    const voters = eligibleVoterIds(poll);
    if (!voters.includes(userId)) {
      throw new ApiError("You can't vote on your own removal", 403);
    }

    try {
      db.prepare(
        "INSERT INTO poll_votes (poll_id, user_id, vote) VALUES (?, ?, ?)",
      ).run(pollId, userId, vote ? 1 : 0);
    } catch (err) {
      if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
        throw new ApiError("Already voted on this poll", 409);
      }
      throw err;
    }

    let payout: PayoutResult | null = null;

    if (!vote) {
      db.prepare("UPDATE polls SET status = 'rejected' WHERE id = ?").run(pollId);
      payout = advanceRoundIfComplete(poll.group_id);
      return { poll: getPoll(pollId), payout };
    }

    if (poll.change_type === "start_cycle") {
      const agreement = getCurrentAgreement(poll.group_id);
      if (agreement) recordAcceptance(agreement.id, userId);
    }

    const yesVotes = (
      db
        .prepare("SELECT user_id FROM poll_votes WHERE poll_id = ? AND vote = 1")
        .all(pollId) as Array<{ user_id: number }>
    ).map((r) => r.user_id);

    if (approvedUnanimously(poll, voters, yesVotes)) {
      db.prepare("UPDATE polls SET status = 'approved' WHERE id = ?").run(pollId);
      payout = applyApprovedPoll(poll);
    }

    return { poll: getPoll(pollId), payout };
  })();
}

function approvedUnanimously(
  poll: PollRow,
  eligible: number[],
  yesVotes: number[],
): boolean {
  if (poll.change_type === "start_cycle") {
    const agreement = getCurrentAgreement(poll.group_id);
    return canCompleteStartCycle({
      eligibleVoterIds: eligible,
      approvedVoterIds: yesVotes,
      agreementAcceptedUserIds: agreement
        ? getAcceptances(agreement.id).map((a) => a.user_id)
        : [],
    }).ok;
  }
  return eligible.every((id) => yesVotes.includes(id));
}

/** Apply an approved poll's change; returns any payout it unblocked. */
function applyApprovedPoll(poll: PollRow): PayoutResult | null {
  const db = getDb();
  const group = db
    .prepare("SELECT * FROM groups WHERE id = ?")
    .get(poll.group_id) as GroupRow;
  const details = JSON.parse(poll.change_details) as Record<string, unknown>;

  // Setup proposals: write the approved fact, then generate the agreement
  // once all four facts are in (remaining setup polls become moot).
  if (group.phase === "setup") {
    applySetupFact(group, poll.change_type, details);
    if (canGenerateAgreement(getSetupApprovals(group.id)).ok) {
      generateAgreement(group.id);
      db.prepare(
        "UPDATE polls SET status = 'rejected' WHERE group_id = ? AND status = 'open'",
      ).run(group.id);
      db.prepare("UPDATE groups SET phase = 'awaiting_signatures' WHERE id = ?").run(
        group.id,
      );
    }
    return null;
  }

  if (poll.change_type === "start_cycle") {
    beginNextCycle(group.id);
    return null;
  }

  // Live changes. A payout that was waiting on this poll settles under the
  // old terms first; the approved change takes effect from the next round
  // and creates a new agreement version (poll approval = consent).
  let payout: PayoutResult | null = null;

  if (poll.change_type === "remove_member") {
    db.prepare(
      "UPDATE group_members SET active = 0 WHERE group_id = ? AND user_id = ?",
    ).run(group.id, details.targetUserId);
    payout = advanceRoundIfComplete(group.id);
    db.prepare(
      "UPDATE groups SET contribution_amount = ?, round_due_at = ? WHERE id = ?",
    ).run(
      details.newAmount,
      new Date(details.newPayoutDate as string).toISOString(),
      group.id,
    );
  } else if (poll.change_type === "contribution_amount") {
    payout = advanceRoundIfComplete(group.id);
    db.prepare("UPDATE groups SET contribution_amount = ? WHERE id = ?").run(
      details.amount,
      group.id,
    );
  } else if (poll.change_type === "schedule") {
    payout = advanceRoundIfComplete(group.id);
    db.prepare("UPDATE groups SET schedule = ? WHERE id = ?").run(
      details.schedule,
      group.id,
    );
  } else if (poll.change_type === "add_member") {
    // Settle a fully-paid round first; otherwise the new member joins the
    // unsettled round and owes a contribution for it.
    payout = advanceRoundIfComplete(group.id);
    addMember(group.id, details.userName as string, null);
  }

  const updated = db
    .prepare("SELECT * FROM groups WHERE id = ?")
    .get(poll.group_id) as GroupRow;
  snapshotAgreement(updated, "active");

  return payout;
}

function applySetupFact(
  group: GroupRow,
  changeType: ChangeType,
  details: Record<string, unknown>,
): void {
  const db = getDb();
  if (changeType === "contribution_amount") {
    db.prepare("UPDATE groups SET contribution_amount = ? WHERE id = ?").run(
      details.amount,
      group.id,
    );
  } else if (changeType === "schedule") {
    db.prepare("UPDATE groups SET schedule = ? WHERE id = ?").run(
      details.schedule,
      group.id,
    );
  } else if (changeType === "round1_start_date") {
    db.prepare("UPDATE groups SET round1_start_at = ? WHERE id = ?").run(
      details.startDate,
      group.id,
    );
  } else if (changeType === "rotation_order") {
    const ids = details.orderedUserIds as number[];
    const setPosition = db.prepare(
      "UPDATE group_members SET rotation_position = ? WHERE group_id = ? AND user_id = ?",
    );
    ids.forEach((memberId, index) => {
      setPosition.run(index + 1, group.id, memberId);
    });
  }
}
