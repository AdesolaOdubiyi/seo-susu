/** Plain-language labels for anything users see. Keep codes out of the UI. */

const PHASE_LABELS = {
  setup: "Setting up",
  awaiting_signatures: "Waiting for signatures",
  scheduled: "Starting soon",
  live: "In progress",
  cycle_complete: "Cycle finished",
} as const;

const AGREEMENT_STATUS_LABELS = {
  awaiting_signatures: "Waiting for signatures",
  active: "Signed and active",
  superseded: "Replaced by a newer version",
  expired: "Expired",
} as const;

const POLL_STATUS_LABELS = {
  open: "Waiting for votes",
  approved: "Approved",
  rejected: "Not approved",
  expired: "Voting ended",
} as const;

const POLL_TYPE_LABELS = {
  contribution_amount: "Contribution amount",
  schedule: "How often we contribute",
  rotation_order: "Payout order",
  round1_start_date: "Round 1 start date",
  add_member: "Add a member",
  remove_member: "Remove a member",
  start_cycle: "Start the next cycle",
} as const;

export function phaseLabel(phase: string): string {
  return PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? "Updating";
}

export function agreementStatusLabel(status: string): string {
  return (
    AGREEMENT_STATUS_LABELS[status as keyof typeof AGREEMENT_STATUS_LABELS] ??
    "Updating"
  );
}

export function pollStatusLabel(status: string): string {
  return (
    POLL_STATUS_LABELS[status as keyof typeof POLL_STATUS_LABELS] ?? "Updating"
  );
}

export function pollTypeLabel(changeType: string): string {
  return (
    POLL_TYPE_LABELS[changeType as keyof typeof POLL_TYPE_LABELS] ??
    "A group decision"
  );
}

/** Map settle / payout reason codes to calm plain English. */
export function payoutPausedMessage(reason: string | null | undefined): string {
  if (!reason) {
    return "This payout is paused for now.";
  }
  if (reason.startsWith("open_poll")) {
    return "A group decision is still open. Finish voting before this payout is released.";
  }
  switch (reason) {
    case "missing_contributions":
      return "Waiting for everyone to mark their contribution as sent.";
    case "cycle_complete":
      return "Everyone has already received a payout in this cycle.";
    case "need_two_active_members":
      return "This susu needs at least two active members before a payout can go out.";
    case "ready":
      return "Ready to pay out.";
    default:
      return "This payout is paused for now.";
  }
}

export function memberDisplayName(
  name: string | undefined,
  fallback = "A member",
): string {
  return name?.trim() || fallback;
}
