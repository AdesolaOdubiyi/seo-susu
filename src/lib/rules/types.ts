/** Pure rule types. No SQLite rows - backend maps DB → these shapes. */

export type Cadence = "weekly" | "biweekly" | "monthly";

export type GroupPhase =
  | "setup"
  | "awaiting_signatures"
  | "scheduled"
  | "live"
  | "cycle_complete";

export type LivePollChangeType =
  | "contribution_amount"
  | "schedule"
  | "add_member"
  | "remove_member"
  | "start_cycle";

export type SetupProposalType =
  | "contribution_amount"
  | "schedule"
  | "rotation_order"
  | "round1_start_date";

export interface PolicyMember {
  userId: number;
  name: string;
  /** Fixed rotation position (1-based or 0-based - treat as sort key ascending). */
  rotationPosition: number;
  active: boolean;
  payoutReceivedThisCycle: boolean;
}

export interface OpenPollSummary {
  id: number;
  changeType: LivePollChangeType | SetupProposalType | string;
  deadline: string; // ISO
  status: "open" | "approved" | "rejected";
}

export interface PolicyDecision {
  ok: boolean;
  reason: string;
}

export interface RemoveMemberDetails {
  targetUserId: number;
  newAmount: number;
  newPayoutDate: string; // ISO
}

export interface SetupApprovals {
  contributionAmountApproved: boolean;
  cadenceApproved: boolean;
  rotationOrderApproved: boolean;
  round1StartDateApproved: boolean;
}

export interface StartCycleVotes {
  /** Active member userIds who must approve. */
  eligibleVoterIds: number[];
  /** userIds who approved the start_cycle proposal. */
  approvedVoterIds: number[];
  /** userIds who accepted the current agreement version. */
  agreementAcceptedUserIds: number[];
}
