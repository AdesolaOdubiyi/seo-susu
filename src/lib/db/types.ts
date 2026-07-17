import type { GroupPhase } from "@/lib/rules";

export const SCHEDULES = ["weekly", "biweekly", "monthly"] as const;
export type Schedule = (typeof SCHEDULES)[number];

/** Poll types available while the group is live (docs/CHANGE_RULES.md). */
export const LIVE_POLL_TYPES = [
  "contribution_amount",
  "schedule",
  "add_member",
  "remove_member",
  "start_cycle",
] as const;

/** Setup proposal types (phase = setup). */
export const SETUP_POLL_TYPES = [
  "contribution_amount",
  "schedule",
  "rotation_order",
  "round1_start_date",
] as const;

export type ChangeType =
  | (typeof LIVE_POLL_TYPES)[number]
  | (typeof SETUP_POLL_TYPES)[number];

export type PollStatus = "open" | "approved" | "rejected";

export type AgreementStatus =
  | "awaiting_signatures"
  | "active"
  | "superseded"
  | "expired";

export interface UserRow {
  id: number;
  name: string;
  invite_code_used: string | null;
}

export interface GroupRow {
  id: number;
  name: string;
  invite_code: string;
  phase: GroupPhase;
  contribution_amount: number | null;
  schedule: Schedule | null;
  round1_start_at: string | null;
  current_cycle: number;
  current_round: number;
  round_due_at: string | null;
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

export interface AgreementRow {
  id: number;
  group_id: number;
  cycle_number: number;
  version: number;
  status: AgreementStatus;
  terms_json: string;
  rendered_text: string;
  content_hash: string;
  generated_at: string;
  signing_deadline: string | null;
  effective_at: string | null;
  supersedes_id: number | null;
}

export interface AcceptanceRow {
  agreement_id: number;
  user_id: number;
  accepted_at: string;
  agreement_hash: string;
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
