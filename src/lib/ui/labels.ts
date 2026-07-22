/** Plain-language labels for anything users see. Keep codes out of the UI. */

export function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    setup: "Setting up",
    awaiting_signatures: "Waiting for signatures",
    scheduled: "Starting soon",
    live: "In progress",
    cycle_complete: "Cycle finished",
  };
  return map[phase] ?? "Updating";
}

export function agreementStatusLabel(status: string): string {
  const map: Record<string, string> = {
    awaiting_signatures: "Waiting for signatures",
    active: "Signed and active",
    superseded: "Replaced by a newer version",
    expired: "Expired",
  };
  return map[status] ?? "Updating";
}

export function pollStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: "Waiting for votes",
    approved: "Approved",
    rejected: "Not approved",
    expired: "Voting ended",
  };
  return map[status] ?? "Updating";
}

export function pollTypeLabel(changeType: string): string {
  const map: Record<string, string> = {
    contribution_amount: "Contribution amount",
    schedule: "How often we contribute",
    rotation_order: "Payout order",
    round1_start_date: "Round 1 start date",
    add_member: "Add a member",
    remove_member: "Remove a member",
    start_cycle: "Start the next cycle",
  };
  return map[changeType] ?? "A group decision";
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

export function memberDisplayName(name: string | undefined, fallback = "A member"): string {
  return name?.trim() || fallback;
}
