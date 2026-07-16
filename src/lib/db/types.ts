export const SCHEDULES = ["weekly", "biweekly", "monthly"] as const;
export type Schedule = (typeof SCHEDULES)[number];

export const CHANGE_TYPES = [
  "contribution_amount",
  "schedule",
  "add_member",
  "remove_member",
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export type PollStatus = "open" | "approved" | "rejected";

export interface UserRow {
  id: number;
  name: string;
  invite_code_used: string | null;
}

export interface GroupRow {
  id: number;
  name: string;
  invite_code: string;
  contribution_amount: number;
  schedule: Schedule;
  current_cycle: number;
  current_round: number;
  round_due_at: string;
  cycle_complete: number;
}

export interface GroupMemberRow {
  group_id: number;
  user_id: number;
  rotation_position: number;
  active: number;
  payout_received: number;
}

/** group_members joined with users for display. */
export interface MemberWithUser extends GroupMemberRow {
  name: string;
}

export interface ContributionRow {
  id: number;
  group_id: number;
  user_id: number;
  cycle_number: number;
  round_number: number;
  status: string;
  timestamp: string;
}

export interface PollRow {
  id: number;
  group_id: number;
  proposed_by: number;
  change_type: ChangeType;
  change_details: string;
  deadline: string;
  status: PollStatus;
}

export interface PollVoteRow {
  poll_id: number;
  user_id: number;
  vote: number;
}

/** Domain error carrying an HTTP status; routes map it to a JSON error response. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
