import { proposalExpiresAt } from "./polls";
import type { GroupPhase, PolicyDecision, SetupApprovals } from "./types";

/** Agreement may be generated only after all setup facts are approved. */
export function canGenerateAgreement(
  approvals: SetupApprovals,
): PolicyDecision {
  if (!approvals.contributionAmountApproved) {
    return { ok: false, reason: "amount_not_approved" };
  }
  if (!approvals.cadenceApproved) {
    return { ok: false, reason: "cadence_not_approved" };
  }
  if (!approvals.rotationOrderApproved) {
    return { ok: false, reason: "rotation_not_approved" };
  }
  if (!approvals.round1StartDateApproved) {
    return { ok: false, reason: "round1_date_not_approved" };
  }
  return { ok: true, reason: "ready" };
}

/** Group goes live only after signatures complete and Round 1 date is reached. */
export function canEnterLive(input: {
  allActiveMembersSigned: boolean;
  round1StartAt: Date | string;
  now?: Date | string;
}): PolicyDecision {
  if (!input.allActiveMembersSigned) {
    return { ok: false, reason: "signatures_incomplete" };
  }
  const start =
    typeof input.round1StartAt === "string"
      ? new Date(input.round1StartAt)
      : input.round1StartAt;
  const now =
    typeof input.now === "string"
      ? new Date(input.now)
      : (input.now ?? new Date());
  if (Number.isNaN(start.getTime()) || Number.isNaN(now.getTime())) {
    return { ok: false, reason: "invalid_date" };
  }
  if (now.getTime() < start.getTime()) {
    return { ok: false, reason: "before_round1_start" };
  }
  return { ok: true, reason: "live" };
}

export function nextPhaseAfterSignatures(input: {
  allSigned: boolean;
  round1StartAt: Date | string;
  now?: Date | string;
}): GroupPhase {
  if (!input.allSigned) return "awaiting_signatures";
  const live = canEnterLive({
    allActiveMembersSigned: true,
    round1StartAt: input.round1StartAt,
    now: input.now,
  });
  return live.ok ? "live" : "scheduled";
}

export function agreementSigningDeadline(
  generatedAt: Date | string,
): Date {
  return proposalExpiresAt(generatedAt, 7);
}

export function startDateProposalDeadline(
  openedAt: Date | string,
): Date {
  return proposalExpiresAt(openedAt, 7);
}
