import type { Cadence, GroupPhase, OpenPollSummary } from "@/lib/rules";

/** Live group facts from status API / DB adapters. Wins over agreement if they conflict. */
export interface LiveGroupStatus {
  groupId: number;
  groupName: string;
  phase: GroupPhase;
  contributionAmount: number;
  cadence: Cadence;
  currentCycle: number;
  currentRound: number;
  roundDueAt: string; // ISO
  pot: number;
  stalled: boolean;
  payoutBlocked: boolean;
  payoutBlockedReason: string | null;
  nextRecipient: { userId: number; name: string } | null;
  members: Array<{
    userId: number;
    name: string;
    rotationPosition: number;
    active: boolean;
    payoutReceivedThisCycle: boolean;
    contributedThisRound: boolean;
  }>;
  openPolls: OpenPollSummary[];
}

/** Structured Group Agreement snapshot (terms_json shape). */
export interface AgreementSnapshot {
  version: number;
  cycleNumber: number;
  effectiveAt: string | null; // ISO
  contentHash: string;
  groupName: string;
  contributionAmount: number;
  cadence: Cadence;
  expectedPot: number;
  round1StartAt: string; // ISO
  payoutOrder: Array<{ userId: number; name: string; rotationPosition: number }>;
  /** Plain simulation disclaimer from the signed text. */
  simulationDisclaimer: string;
}

export interface ChatContextSource {
  kind: "live_status" | "group_agreement" | "general_rules";
  label: string;
  detail?: string;
}

export interface ChatContext {
  /** Ordered sections for the system prompt (live first). */
  sections: Array<{
    id: "live_status" | "group_agreement" | "general_rules";
    title: string;
    body: string;
  }>;
  sources: ChatContextSource[];
  /** True when live facts disagree with the agreement snapshot. */
  agreementMayBeStale: boolean;
  staleNotes: string[];
  activeAgreementVersion: number | null;
  /** Ready-to-send system prompt string. */
  systemPrompt: string;
}

export interface BuildChatContextInput {
  status: LiveGroupStatus | null;
  activeAgreement: AgreementSnapshot | null;
  /** Defaults to built-in FAQ excerpt if omitted. */
  generalRulesExcerpt?: string;
  now?: Date | string;
}
