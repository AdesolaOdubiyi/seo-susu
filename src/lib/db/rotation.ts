import { getDb } from "./index";
import {
  getActiveMembers,
  getCurrentRecipient,
  getGroup,
} from "./groups";
import { nextDueDate } from "./schedule";
import {
  calculatePot,
  canSettlePayout,
  type OpenPollSummary,
} from "@/lib/rules";
import { ApiError, GroupRow } from "./types";

/**
 * Auto-reject open polls that are past their deadline (contract: on expiry,
 * old terms stay and payout unblocks). Lazy — run before any decision that
 * depends on open polls.
 */
export function expireOverduePolls(groupId: number): void {
  getDb()
    .prepare(
      "UPDATE polls SET status = 'rejected' WHERE group_id = ? AND status = 'open' AND deadline < ?",
    )
    .run(groupId, new Date().toISOString());
}

export function listOpenPolls(groupId: number): OpenPollSummary[] {
  return getDb()
    .prepare(
      `SELECT id, change_type AS changeType, deadline, status
       FROM polls WHERE group_id = ? AND status = 'open' ORDER BY id`,
    )
    .all(groupId) as OpenPollSummary[];
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
 * Simulate the payout and advance the rotation, but only once the round is
 * settled per the shared policy: every active member contributed AND no
 * open poll is blocking (expired polls are auto-rejected first).
 *
 * Called after every event that could unblock a round: a contribution, a
 * poll being settled, or a member dropping out. Returns null when the round
 * isn't ready to advance.
 */
export function advanceRoundIfComplete(groupId: number): PayoutResult | null {
  const db = getDb();

  return db.transaction(() => {
    const group = getGroup(groupId);
    if (group.phase !== "live" || !group.schedule) return null;

    expireOverduePolls(groupId);

    const active = getActiveMembers(groupId);
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

    const settle = canSettlePayout({
      activeMemberCount: active.length,
      allActiveContributed: active.every((m) => paid.has(m.user_id)),
      cycleComplete: false,
      openPolls: listOpenPolls(groupId),
    });
    if (!settle.ok) return null;

    const recipient = getCurrentRecipient(group);
    if (!recipient) {
      // No unpaid active member left (e.g. the last unpaid member was
      // removed) — the cycle is complete.
      db.prepare("UPDATE groups SET phase = 'cycle_complete' WHERE id = ?").run(
        groupId,
      );
      return null;
    }

    db.prepare(
      "UPDATE group_members SET payout_received = 1 WHERE group_id = ? AND user_id = ?",
    ).run(groupId, recipient.user_id);

    const everyonePaid = active.every(
      (m) => m.user_id === recipient.user_id || m.payout_received === 1,
    );
    if (everyonePaid) {
      // Cycle over. The group stays intact; the next cycle needs a unanimous
      // start_cycle poll (nobody starts Cycle 2 alone).
      db.prepare("UPDATE groups SET phase = 'cycle_complete' WHERE id = ?").run(
        groupId,
      );
    } else {
      // Keep the payment rhythm: next due is one cadence interval after the
      // old due date, or after now if the round settled late.
      const oldDue = group.round_due_at ? new Date(group.round_due_at) : new Date();
      const base = oldDue.getTime() > Date.now() ? oldDue : new Date();
      db.prepare(
        `UPDATE groups SET current_round = current_round + 1, round_due_at = ?
         WHERE id = ?`,
      ).run(nextDueDate(group.schedule, base).toISOString(), groupId);
    }

    return {
      recipient: { userId: recipient.user_id, name: recipient.name },
      amount: calculatePot(active.length, group.contribution_amount ?? 0),
      cycle: group.current_cycle,
      round: group.current_round,
      cycleComplete: everyonePaid,
    };
  })();
}

/**
 * Begin the next cycle after a unanimous, agreement-accepting start_cycle
 * poll (see polls.ts). Payout flags reset; inactive members stay out.
 */
export function beginNextCycle(groupId: number): GroupRow {
  const db = getDb();
  const group = getGroup(groupId);
  if (group.phase !== "cycle_complete" || !group.schedule) {
    throw new ApiError("The current cycle isn't complete yet", 409);
  }

  db.prepare(
    `UPDATE groups
     SET current_cycle = current_cycle + 1, current_round = 1,
         phase = 'live', round_due_at = ?
     WHERE id = ?`,
  ).run(nextDueDate(group.schedule).toISOString(), groupId);
  db.prepare(
    "UPDATE group_members SET payout_received = 0 WHERE group_id = ?",
  ).run(groupId);

  return getGroup(groupId);
}
