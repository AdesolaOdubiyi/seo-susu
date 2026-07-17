import type {
  PolicyDecision,
  RemoveMemberDetails,
  StartCycleVotes,
} from "./types";

export function canProposeStartCycle(input: {
  cycleComplete: boolean;
  proposerIsActive: boolean;
}): PolicyDecision {
  if (!input.proposerIsActive) {
    return { ok: false, reason: "proposer_inactive" };
  }
  if (!input.cycleComplete) {
    return { ok: false, reason: "cycle_not_complete" };
  }
  return { ok: true, reason: "ok" };
}

/**
 * Next cycle starts only when every eligible voter approved
 * and every eligible voter accepted the current agreement version.
 */
export function canCompleteStartCycle(
  votes: StartCycleVotes,
): PolicyDecision {
  const eligible = new Set(votes.eligibleVoterIds);
  if (eligible.size === 0) {
    return { ok: false, reason: "no_eligible_voters" };
  }
  for (const id of eligible) {
    if (!votes.approvedVoterIds.includes(id)) {
      return { ok: false, reason: `missing_approval:${id}` };
    }
    if (!votes.agreementAcceptedUserIds.includes(id)) {
      return { ok: false, reason: `missing_agreement_accept:${id}` };
    }
  }
  return { ok: true, reason: "unanimous" };
}

/** remove_member poll details must include target, positive amount, and a future payout date. */
export function validateRemoveMemberDetails(
  details: RemoveMemberDetails,
  now: Date | string = new Date(),
): PolicyDecision {
  if (!Number.isFinite(details.targetUserId)) {
    return { ok: false, reason: "invalid_target" };
  }
  if (!(details.newAmount > 0) || !Number.isFinite(details.newAmount)) {
    return { ok: false, reason: "invalid_amount" };
  }
  const payout = new Date(details.newPayoutDate);
  const n = typeof now === "string" ? new Date(now) : now;
  if (Number.isNaN(payout.getTime())) {
    return { ok: false, reason: "invalid_payout_date" };
  }
  if (payout.getTime() <= n.getTime()) {
    return { ok: false, reason: "payout_date_not_future" };
  }
  return { ok: true, reason: "valid" };
}

/** Eligible voters for remove_member exclude the removal target. */
export function eligibleVotersForRemove(
  activeUserIds: number[],
  targetUserId: number,
): number[] {
  return activeUserIds.filter((id) => id !== targetUserId);
}
