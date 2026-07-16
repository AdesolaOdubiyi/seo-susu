import { getDb } from "./index";
import {
  addMember,
  getActiveMembers,
  getGroup,
  getMembers,
  requireActiveMember,
} from "./groups";
import { advanceRoundIfComplete, getRoundDeadline, PayoutResult } from "./rotation";
import {
  ApiError,
  ChangeType,
  CHANGE_TYPES,
  MemberWithUser,
  PollRow,
  PollVoteRow,
  SCHEDULES,
  Schedule,
} from "./types";

export interface PollWithVotes extends PollRow {
  proposed_by_name: string;
  votes: Array<{ userId: number; name: string; vote: boolean }>;
  approvals: number;
  votesNeeded: number;
}

/**
 * Propose a change to the group's terms. Requires unanimous approval from
 * eligible voters (active members — excluding the target of a
 * 'remove_member' poll, who gets no veto over their own removal). Polls
 * never block payouts; default deadline is the next scheduled payment date.
 */
export function createPoll(input: {
  groupId: number;
  proposedBy: number;
  changeType: ChangeType;
  changeDetails: unknown;
  deadline?: string;
}): PollWithVotes {
  const db = getDb();
  const group = getGroup(input.groupId);
  requireActiveMember(input.groupId, input.proposedBy);
  validateChangeDetails(input.groupId, input.changeType, input.changeDetails);

  let deadline: string;
  if (input.deadline !== undefined) {
    if (Number.isNaN(Date.parse(input.deadline))) {
      throw new ApiError("deadline must be an ISO date string");
    }
    deadline = new Date(input.deadline).toISOString();
  } else {
    const roundDeadline = getRoundDeadline(group);
    deadline =
      roundDeadline.getTime() > Date.now()
        ? roundDeadline.toISOString()
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  }

  const pollId = db
    .prepare(
      `INSERT INTO polls (group_id, proposed_by, change_type, change_details, deadline, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
    )
    .run(
      input.groupId,
      input.proposedBy,
      input.changeType,
      JSON.stringify(input.changeDetails ?? {}),
      deadline,
    ).lastInsertRowid as number;

  return getPoll(pollId);
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
    votesNeeded: eligibleVoters(poll).length,
  };
}

/**
 * Who must approve for the poll to pass: every active member, except that a
 * 'remove_member' target can't vote on (or veto) their own removal.
 */
function eligibleVoters(poll: PollRow): MemberWithUser[] {
  const active = getActiveMembers(poll.group_id);
  if (poll.change_type !== "remove_member") return active;
  const { userId } = JSON.parse(poll.change_details) as { userId: number };
  return active.filter((m) => m.user_id !== userId);
}

export function listPolls(groupId: number): PollWithVotes[] {
  getGroup(groupId);
  const ids = getDb()
    .prepare("SELECT id FROM polls WHERE group_id = ? ORDER BY id DESC")
    .all(groupId) as Array<{ id: number }>;
  return ids.map(({ id }) => getPoll(id));
}

/**
 * Record a vote. Approval must be unanimous among eligible voters: any
 * rejection settles the poll as rejected; once every eligible voter has
 * approved, the change is applied. Removing a non-payer can settle the
 * current round (their contribution is no longer owed), so the rotation is
 * re-checked afterwards — the recipient is paid the shrunken pot.
 */
export function votePoll(
  pollId: number,
  userId: number,
  vote: boolean,
): { poll: PollWithVotes; payout: PayoutResult | null } {
  const db = getDb();

  return db.transaction(() => {
    const poll = getPoll(pollId);
    if (poll.status !== "open") {
      throw new ApiError(`This poll is already ${poll.status}`, 409);
    }
    requireActiveMember(poll.group_id, userId);
    const voters = eligibleVoters(poll);
    if (!voters.some((m) => m.user_id === userId)) {
      throw new ApiError("You can't vote on your own removal", 403);
    }

    try {
      db.prepare(
        "INSERT INTO poll_votes (poll_id, user_id, vote) VALUES (?, ?, ?)",
      ).run(pollId, userId, vote ? 1 : 0);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("UNIQUE constraint failed")
      ) {
        throw new ApiError("Already voted on this poll", 409);
      }
      throw err;
    }

    let payout: PayoutResult | null = null;
    if (!vote) {
      db.prepare("UPDATE polls SET status = 'rejected' WHERE id = ?").run(pollId);
    } else {
      const allApproved = voters.every(
        (m) =>
          db
            .prepare(
              "SELECT 1 FROM poll_votes WHERE poll_id = ? AND user_id = ? AND vote = 1",
            )
            .get(pollId, m.user_id) !== undefined,
      );
      if (allApproved) {
        db.prepare("UPDATE polls SET status = 'approved' WHERE id = ?").run(pollId);
        if (poll.change_type === "remove_member") {
          payout = applyRemovalAndNewTerms(poll);
        } else {
          applyChange(poll);
          payout = advanceRoundIfComplete(poll.group_id);
        }
      }
    }

    return { poll: getPoll(pollId), payout };
  })();
}

function validateChangeDetails(
  groupId: number,
  changeType: ChangeType,
  details: unknown,
): void {
  if (!CHANGE_TYPES.includes(changeType)) {
    throw new ApiError(`changeType must be one of: ${CHANGE_TYPES.join(", ")}`);
  }
  const obj = (details ?? {}) as Record<string, unknown>;
  if (changeType === "contribution_amount") {
    if (typeof obj.amount !== "number" || obj.amount <= 0) {
      throw new ApiError('changeDetails must include a positive "amount" number');
    }
  }
  if (changeType === "schedule") {
    if (!SCHEDULES.includes(obj.schedule as Schedule)) {
      throw new ApiError(
        `changeDetails.schedule must be one of: ${SCHEDULES.join(", ")}`,
      );
    }
  }
  if (changeType === "add_member") {
    if (typeof obj.userName !== "string" || obj.userName.trim() === "") {
      throw new ApiError('changeDetails must include a non-empty "userName"');
    }
    const taken = getMembers(groupId).some(
      (m) => m.name.toLowerCase() === (obj.userName as string).trim().toLowerCase(),
    );
    if (taken) {
      throw new ApiError("A member with that name already exists in this group");
    }
  }
  if (changeType === "remove_member") {
    if (typeof obj.userId !== "number") {
      throw new ApiError('changeDetails must include the "userId" of the member to remove');
    }
    const target = getActiveMembers(groupId).find((m) => m.user_id === obj.userId);
    if (!target) {
      throw new ApiError("That user is not an active member of this group");
    }
    // Removing someone changes the group's math, so the proposal must also
    // carry the renegotiated terms the group is voting on.
    if (typeof obj.amount !== "number" || obj.amount <= 0) {
      throw new ApiError(
        'changeDetails must include "amount" — the new payment amount after the removal',
      );
    }
    if (typeof obj.payoutDate !== "string" || Number.isNaN(Date.parse(obj.payoutDate))) {
      throw new ApiError(
        'changeDetails must include "payoutDate" — the new payout due date (ISO string)',
      );
    }
    if (Date.parse(obj.payoutDate) <= Date.now()) {
      throw new ApiError('"payoutDate" must be in the future');
    }
  }
}

function applyChange(poll: PollRow): void {
  const db = getDb();
  const details = JSON.parse(poll.change_details) as Record<string, unknown>;

  if (poll.change_type === "contribution_amount") {
    db.prepare("UPDATE groups SET contribution_amount = ? WHERE id = ?").run(
      details.amount,
      poll.group_id,
    );
  } else if (poll.change_type === "schedule") {
    db.prepare("UPDATE groups SET schedule = ? WHERE id = ?").run(
      details.schedule,
      poll.group_id,
    );
  } else if (poll.change_type === "add_member") {
    // Mid-cycle join: appended to the end of the rotation, so they receive
    // their payout after everyone already in line this cycle.
    addMember(poll.group_id, (details.userName as string).trim(), null);
  }
}

/**
 * Apply an approved removal: the member is voted out (e.g. stopped paying),
 * which may settle the current round — that payout still happens under the
 * old terms, shrunk by the removed member's share. The renegotiated terms
 * the group approved (new payment amount, new payout due date) take effect
 * after that.
 */
function applyRemovalAndNewTerms(poll: PollRow): PayoutResult | null {
  const db = getDb();
  const details = JSON.parse(poll.change_details) as {
    userId: number;
    amount: number;
    payoutDate: string;
  };

  db.prepare(
    "UPDATE group_members SET active = 0 WHERE group_id = ? AND user_id = ?",
  ).run(poll.group_id, details.userId);

  const payout = advanceRoundIfComplete(poll.group_id);

  db.prepare(
    "UPDATE groups SET contribution_amount = ?, round_due_at = ? WHERE id = ?",
  ).run(details.amount, new Date(details.payoutDate).toISOString(), poll.group_id);

  return payout;
}
