import { getGroupStatus, type GroupStatus } from "@/lib/db/contributions";
import { getDb } from "@/lib/db";
import { getCurrentAgreement } from "@/lib/db/agreements";
import type { AgreementRow } from "@/lib/db/types";
import type { Cadence, OpenPollSummary } from "@/lib/rules";
import { canSettlePayout } from "@/lib/rules";
import type { AgreementSnapshot, LiveGroupStatus } from "./types";

function asCadence(schedule: string): Cadence {
  if (schedule === "weekly" || schedule === "biweekly" || schedule === "monthly") {
    return schedule;
  }
  return "weekly";
}

function listOpenPolls(groupId: number): OpenPollSummary[] {
  return getDb()
    .prepare(
      `SELECT id, change_type AS changeType, deadline, status
       FROM polls
       WHERE group_id = ? AND status = 'open'
       ORDER BY id`,
    )
    .all(groupId) as OpenPollSummary[];
}

/** Map DB group status into the LLM LiveGroupStatus shape. */
export function toLiveGroupStatus(
  status: GroupStatus,
  openPolls: OpenPollSummary[],
  now: Date = new Date(),
): LiveGroupStatus {
  const activeCount = status.members.filter((m) => m.active).length;
  const allContributed = status.members
    .filter((m) => m.active)
    .every((m) => m.contributedThisRound);

  const settle = canSettlePayout({
    activeMemberCount: activeCount,
    allActiveContributed: allContributed,
    cycleComplete: status.group.cycleComplete,
    openPolls,
    now,
  });

  const payoutBlocked = !settle.ok && settle.reason.startsWith("open_poll");
  // Also block display when open polls exist even if contributions incomplete
  const openBlocking = openPolls.length > 0;
  const blocked = payoutBlocked || openBlocking;

  return {
    groupId: status.group.id,
    groupName: status.group.name,
    phase: status.group.cycleComplete ? "cycle_complete" : "live",
    contributionAmount: status.group.contributionAmount,
    cadence: asCadence(status.group.schedule),
    currentCycle: status.group.currentCycle,
    currentRound: status.group.currentRound,
    roundDueAt: status.round.deadline,
    pot: status.round.potAmount,
    stalled: status.round.stalled,
    payoutBlocked: blocked,
    payoutBlockedReason: blocked
      ? payoutBlocked
        ? settle.reason
        : `open_poll:${openPolls.map((p) => p.id).join(",")}`
      : null,
    nextRecipient: status.currentRecipient,
    members: status.members.map((m) => ({
      userId: m.userId,
      name: m.name,
      rotationPosition: m.rotationPosition,
      active: m.active,
      payoutReceivedThisCycle: m.payoutReceived,
      contributedThisRound: m.contributedThisRound,
    })),
    openPolls,
  };
}

/** Load live status for chat grounding (highest-priority context tier). */
export function loadLiveGroupStatus(groupId: number): LiveGroupStatus {
  const status = getGroupStatus(groupId);
  const openPolls = listOpenPolls(groupId);
  return toLiveGroupStatus(status, openPolls);
}

/** The structured terms stored in an agreement's terms_json. */
interface AgreementTerms {
  groupName: string;
  contributionAmount: number | null;
  cadence: Cadence;
  expectedPot: number;
  round1StartDate: string | null;
  members: Array<{ userId: number; name: string; rotationPosition: number }>;
  disclaimer: string;
}

/**
 * Map a stored agreement row into the LLM AgreementSnapshot shape. The signed
 * terms live in terms_json; effectiveAt and contentHash come from the row.
 * Pure (no DB) so the field mapping is unit-testable.
 */
export function agreementSnapshotFromRow(row: AgreementRow): AgreementSnapshot {
  const terms = JSON.parse(row.terms_json) as AgreementTerms;
  return {
    version: row.version,
    cycleNumber: row.cycle_number,
    effectiveAt: row.effective_at,
    contentHash: row.content_hash,
    groupName: terms.groupName,
    contributionAmount: terms.contributionAmount ?? 0,
    cadence: terms.cadence,
    expectedPot: terms.expectedPot,
    round1StartAt: terms.round1StartDate ?? "",
    payoutOrder: terms.members,
    simulationDisclaimer: terms.disclaimer,
  };
}

/**
 * Load the group's active/awaiting agreement as a snapshot for chat grounding
 * (second-priority context tier), or null if the group has none yet
 * (e.g. still in setup).
 */
export function loadActiveAgreement(groupId: number): AgreementSnapshot | null {
  const row = getCurrentAgreement(groupId);
  return row ? agreementSnapshotFromRow(row) : null;
}
