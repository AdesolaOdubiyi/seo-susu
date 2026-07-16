import { getDb } from "./index";
import {
  getActiveMembers,
  getCurrentRecipient,
  getGroup,
  requireActiveMember,
} from "./groups";
import { nextDueDate } from "./schedule";
import { ApiError, GroupRow } from "./types";

/** When the current round's payment is due. */
export function getRoundDeadline(group: GroupRow): Date {
  return new Date(group.round_due_at);
}

export interface PayoutResult {
  recipient: { userId: number; name: string };
  amount: number;
  cycle: number;
  round: number;
  /** True when this payout finished the cycle (everyone has been paid). */
  cycleComplete: boolean;
}

/**
 * Simulate the payout and advance the rotation once every active member has
 * contributed this round. The payout is never blocked by polls — the pot is
 * (active members x amount), so removing a non-payer shrinks it and lets the
 * round settle.
 *
 * Called after every event that could settle a round: a contribution, a
 * member being voted out, or a member dropping out. Returns null when the
 * round isn't ready to advance.
 */
export function advanceRoundIfComplete(groupId: number): PayoutResult | null {
  const db = getDb();

  return db.transaction(() => {
    const group = getGroup(groupId);
    if (group.cycle_complete === 1) return null;

    const active = getActiveMembers(groupId);
    if (active.length < 2) return null;

    const paid = new Set(
      (
        db
          .prepare(
            `SELECT user_id FROM contributions
             WHERE group_id = ? AND cycle_number = ? AND round_number = ?`,
          )
          .all(groupId, group.current_cycle, group.current_round) as Array<{
          user_id: number;
        }>
      ).map((r) => r.user_id),
    );
    if (!active.every((m) => paid.has(m.user_id))) return null;

    const recipient = getCurrentRecipient(group);
    if (!recipient) return null;

    db.prepare(
      "UPDATE group_members SET payout_received = 1 WHERE group_id = ? AND user_id = ?",
    ).run(groupId, recipient.user_id);

    const everyonePaid = active.every(
      (m) => m.user_id === recipient.user_id || m.payout_received === 1,
    );
    if (everyonePaid) {
      // Cycle over. The group stays intact; any member may start a new cycle.
      db.prepare("UPDATE groups SET cycle_complete = 1 WHERE id = ?").run(groupId);
    } else {
      db.prepare(
        `UPDATE groups SET current_round = current_round + 1, round_due_at = ?
         WHERE id = ?`,
      ).run(nextDueDate(group.schedule).toISOString(), groupId);
    }

    return {
      recipient: { userId: recipient.user_id, name: recipient.name },
      amount: group.contribution_amount * active.length,
      cycle: group.current_cycle,
      round: group.current_round,
      cycleComplete: everyonePaid,
    };
  })();
}

/**
 * Start the next cycle once the current one is complete. Any active member
 * can do this (no admin role). Payout flags reset; inactive members stay out.
 */
export function startNewCycle(groupId: number, userId: number): GroupRow {
  const db = getDb();

  return db.transaction(() => {
    const group = getGroup(groupId);
    requireActiveMember(groupId, userId);
    if (group.cycle_complete !== 1) {
      throw new ApiError(
        "The current cycle isn't complete yet — a new cycle can start once every member has received a payout",
        409,
      );
    }

    db.prepare(
      `UPDATE groups
       SET current_cycle = current_cycle + 1, current_round = 1,
           cycle_complete = 0, round_due_at = ?
       WHERE id = ?`,
    ).run(nextDueDate(group.schedule).toISOString(), groupId);
    db.prepare(
      "UPDATE group_members SET payout_received = 0 WHERE group_id = ?",
    ).run(groupId);

    return getGroup(groupId);
  })();
}
