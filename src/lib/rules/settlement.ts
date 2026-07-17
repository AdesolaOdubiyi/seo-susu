import { payoutBlockedByOpenPolls } from "./polls";
import type { OpenPollSummary, PolicyDecision } from "./types";

export interface SettlePayoutInput {
  activeMemberCount: number;
  allActiveContributed: boolean;
  cycleComplete: boolean;
  openPolls: OpenPollSummary[];
  now?: Date | string;
}

/**
 * Payout / round advance only when:
 * - group not cycle_complete
 * - at least 2 active members
 * - every active member contributed
 * - no non-expired open polls
 */
export function canSettlePayout(input: SettlePayoutInput): PolicyDecision {
  if (input.cycleComplete) {
    return { ok: false, reason: "cycle_complete" };
  }
  if (input.activeMemberCount < 2) {
    return { ok: false, reason: "need_two_active_members" };
  }
  if (!input.allActiveContributed) {
    return { ok: false, reason: "missing_contributions" };
  }
  const blocked = payoutBlockedByOpenPolls(
    input.openPolls,
    input.now ?? new Date(),
  );
  if (blocked.ok) {
    return { ok: false, reason: blocked.reason };
  }
  return { ok: true, reason: "ready" };
}

export interface StalledInput {
  roundDueAt: Date | string;
  now?: Date | string;
  missingActiveContributions: boolean;
  cycleComplete: boolean;
}

/** Stalled = past due + missing contributions. Status only; no penalty. */
export function isStalled(input: StalledInput): boolean {
  if (input.cycleComplete) return false;
  if (!input.missingActiveContributions) return false;
  const due =
    typeof input.roundDueAt === "string"
      ? new Date(input.roundDueAt)
      : input.roundDueAt;
  const rawNow = input.now ?? new Date();
  const now = typeof rawNow === "string" ? new Date(rawNow) : rawNow;
  return now.getTime() > due.getTime();
}

/**
 * Contributions stay allowed while a poll is open and after the due date.
 * Block only when the group is not live / cycle complete / too few members.
 */
export function canRecordContribution(input: {
  phase: "setup" | "awaiting_signatures" | "scheduled" | "live" | "cycle_complete";
  activeMemberCount: number;
  alreadyContributedThisRound: boolean;
}): PolicyDecision {
  if (input.phase !== "live") {
    return { ok: false, reason: `phase_${input.phase}` };
  }
  if (input.activeMemberCount < 2) {
    return { ok: false, reason: "need_two_active_members" };
  }
  if (input.alreadyContributedThisRound) {
    return { ok: false, reason: "already_contributed" };
  }
  return { ok: true, reason: "ok" };
}
