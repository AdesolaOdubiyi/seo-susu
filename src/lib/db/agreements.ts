import { createHash } from "node:crypto";
import { getDb } from "./index";
import { getActiveMembers, getGroup, requireActiveMember } from "./groups";
import { nextDueDate } from "./schedule";
import {
  agreementSigningDeadline,
  calculatePot,
  canEnterLive,
  canGenerateAgreement,
  type SetupApprovals,
} from "@/lib/rules";
import {
  AcceptanceRow,
  AgreementRow,
  ApiError,
  GroupRow,
} from "./types";

/**
 * Setup facts are "approved" when an approved setup poll of that type exists
 * and the fact is written on the group row.
 */
export function getSetupApprovals(groupId: number): SetupApprovals {
  const db = getDb();
  const group = getGroup(groupId);
  const approved = new Set(
    (
      db
        .prepare(
          "SELECT DISTINCT change_type FROM polls WHERE group_id = ? AND status = 'approved'",
        )
        .all(groupId) as Array<{ change_type: string }>
    ).map((r) => r.change_type),
  );
  return {
    contributionAmountApproved:
      approved.has("contribution_amount") && group.contribution_amount !== null,
    cadenceApproved: approved.has("schedule") && group.schedule !== null,
    rotationOrderApproved: approved.has("rotation_order"),
    round1StartDateApproved:
      approved.has("round1_start_date") && group.round1_start_at !== null,
  };
}

/**
 * Generate the next Group Agreement version from the group's approved facts.
 * Immutable snapshot: structured terms_json is the source of truth and the
 * plain-language text is rendered from it. Supersedes any earlier version.
 */
export function generateAgreement(groupId: number): AgreementRow {
  const group = getGroup(groupId);
  const ready = canGenerateAgreement(getSetupApprovals(groupId));
  if (!ready.ok) {
    throw new ApiError(`Agreement not ready: ${ready.reason}`, 409);
  }
  return snapshotAgreement(group, "awaiting_signatures");
}

/**
 * Re-issue the agreement after a signing window expired back to setup.
 * Any active member can trigger it once the four setup facts are approved.
 */
export function regenerateAgreement(
  groupId: number,
  userId: number,
): AgreementRow {
  const db = getDb();
  return db.transaction(() => {
    const group = syncGroupPhase(groupId);
    requireActiveMember(groupId, userId);
    if (group.phase !== "setup") {
      throw new ApiError(
        `Agreement can only be regenerated from setup (current phase: ${group.phase})`,
        409,
      );
    }
    const agreement = generateAgreement(groupId);
    db.prepare("UPDATE groups SET phase = 'awaiting_signatures' WHERE id = ?").run(
      groupId,
    );
    return agreement;
  })();
}

/**
 * Snapshot the group's current terms as a new agreement version.
 * Live change polls call this with status "active" (poll approval = consent);
 * setup generation uses "awaiting_signatures" + a 7-day signing window.
 */
export function snapshotAgreement(
  group: GroupRow,
  status: "awaiting_signatures" | "active",
): AgreementRow {
  const db = getDb();
  const members = getActiveMembers(group.id);
  const now = new Date();

  const previous = db
    .prepare(
      `SELECT * FROM group_agreements WHERE group_id = ?
       ORDER BY version DESC LIMIT 1`,
    )
    .get(group.id) as AgreementRow | undefined;
  if (previous && (previous.status === "awaiting_signatures" || previous.status === "active")) {
    db.prepare("UPDATE group_agreements SET status = 'superseded' WHERE id = ?").run(
      previous.id,
    );
  }

  const terms = {
    groupId: group.id,
    groupName: group.name,
    cycleNumber: group.current_cycle,
    version: (previous?.version ?? 0) + 1,
    members: members.map((m) => ({
      userId: m.user_id,
      name: m.name,
      rotationPosition: m.rotation_position,
    })),
    contributionAmount: group.contribution_amount,
    cadence: group.schedule,
    expectedPot: calculatePot(members.length, group.contribution_amount ?? 0),
    round1StartDate: group.round1_start_at,
    rules: {
      late: "Late contributions are allowed after the due date. The round stalls until every active member has paid. No penalty this week.",
      polls:
        "Any active member can propose a change. Changes need unanimous approval. Poll deadline is the day before the round is due; expired polls are auto-rejected and old terms stay. Open polls pause payouts, not contributions.",
      leave: "A member can leave any time. The pot shrinks to active members x amount. Unpaid leavers are skipped in the rotation.",
      remove:
        "Removing a member needs a unanimous poll that also sets the new payment amount and the new payout date. The member being removed does not vote.",
      joins:
        "After the rotation starts, joining needs an approved add_member poll. New members go to the end of the rotation.",
      renewal:
        "When everyone has received a payout the cycle ends. The next cycle starts only after every active member approves a start_cycle poll and accepts this agreement.",
    },
    disclaimer:
      "Simulated payouts only. This app does not hold, transfer, insure, or guarantee money. There is no promised profit and this is not risk-free. Signing records consent to these simulated rules; it is not scam protection.",
  };

  const termsJson = JSON.stringify(terms);
  const contentHash = createHash("sha256").update(termsJson).digest("hex");
  const signing = status === "awaiting_signatures";

  const id = db
    .prepare(
      `INSERT INTO group_agreements
         (group_id, cycle_number, version, status, terms_json, rendered_text,
          content_hash, generated_at, signing_deadline, effective_at, supersedes_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      group.id,
      group.current_cycle,
      terms.version,
      status,
      termsJson,
      renderAgreementText(terms),
      contentHash,
      now.toISOString(),
      signing ? agreementSigningDeadline(now).toISOString() : null,
      signing ? null : now.toISOString(),
      previous?.id ?? null,
    ).lastInsertRowid as number;

  return getAgreementById(id);
}

function renderAgreementText(terms: {
  groupName: string;
  cycleNumber: number;
  version: number;
  members: Array<{ name: string; rotationPosition: number }>;
  contributionAmount: number | null;
  cadence: string | null;
  expectedPot: number;
  round1StartDate: string | null;
  rules: Record<string, string>;
  disclaimer: string;
}): string {
  const order = [...terms.members]
    .sort((a, b) => a.rotationPosition - b.rotationPosition)
    .map((m, i) => `${i + 1}. ${m.name}`)
    .join("\n");
  return [
    `${terms.groupName} — Group Agreement (cycle ${terms.cycleNumber}, version ${terms.version})`,
    ``,
    `Members and payout order:`,
    order,
    ``,
    `Each round, every member puts in $${terms.contributionAmount} (${terms.cadence}). One member receives the pot of $${terms.expectedPot}. Round 1 starts on ${terms.round1StartDate ? new Date(terms.round1StartDate).toUTCString() : "the agreed date"}.`,
    ``,
    `House rules:`,
    `- Late payments: ${terms.rules.late}`,
    `- Changes: ${terms.rules.polls}`,
    `- Leaving: ${terms.rules.leave}`,
    `- Removing a member: ${terms.rules.remove}`,
    `- Joining later: ${terms.rules.joins}`,
    `- Next cycle: ${terms.rules.renewal}`,
    ``,
    terms.disclaimer,
  ].join("\n");
}

export function getAgreementById(id: number): AgreementRow {
  const row = getDb()
    .prepare("SELECT * FROM group_agreements WHERE id = ?")
    .get(id) as AgreementRow | undefined;
  if (!row) throw new ApiError("Agreement not found", 404);
  return row;
}

/** The latest signable/effective agreement, or null before one exists. */
export function getCurrentAgreement(groupId: number): AgreementRow | null {
  return (
    (getDb()
      .prepare(
        `SELECT * FROM group_agreements
         WHERE group_id = ? AND status IN ('awaiting_signatures', 'active')
         ORDER BY version DESC LIMIT 1`,
      )
      .get(groupId) as AgreementRow | undefined) ?? null
  );
}

export function listAgreements(groupId: number): AgreementRow[] {
  getGroup(groupId);
  return getDb()
    .prepare(
      "SELECT * FROM group_agreements WHERE group_id = ? ORDER BY version DESC",
    )
    .all(groupId) as AgreementRow[];
}

export function getAcceptances(agreementId: number): AcceptanceRow[] {
  return getDb()
    .prepare("SELECT * FROM agreement_acceptances WHERE agreement_id = ?")
    .all(agreementId) as AcceptanceRow[];
}

/** Record acceptance of an agreement (idempotent). */
export function recordAcceptance(agreementId: number, userId: number): void {
  const agreement = getAgreementById(agreementId);
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO agreement_acceptances
         (agreement_id, user_id, accepted_at, agreement_hash)
       VALUES (?, ?, ?, ?)`,
    )
    .run(agreementId, userId, new Date().toISOString(), agreement.content_hash);
}

/**
 * Sign the group's awaiting agreement. When the last active member signs,
 * the group moves to 'scheduled' (or straight to 'live' if the Round 1 date
 * has already arrived) and the agreement becomes active.
 */
export function signAgreement(
  groupId: number,
  userId: number,
): { agreement: AgreementRow; group: GroupRow } {
  const db = getDb();

  return db.transaction(() => {
    let group = syncGroupPhase(groupId);
    requireActiveMember(groupId, userId);

    if (group.phase !== "awaiting_signatures") {
      throw new ApiError(
        `Nothing to sign — the group is in the '${group.phase}' phase`,
        409,
      );
    }
    const agreement = getCurrentAgreement(groupId);
    if (!agreement || agreement.status !== "awaiting_signatures") {
      throw new ApiError("No agreement is awaiting signatures", 409);
    }

    recordAcceptance(agreement.id, userId);

    const signed = new Set(getAcceptances(agreement.id).map((a) => a.user_id));
    const allSigned = getActiveMembers(groupId).every((m) =>
      signed.has(m.user_id),
    );
    if (allSigned) {
      db.prepare(
        "UPDATE group_agreements SET status = 'active', effective_at = ? WHERE id = ?",
      ).run(group.round1_start_at, agreement.id);
      db.prepare("UPDATE groups SET phase = 'scheduled' WHERE id = ?").run(groupId);
      group = syncGroupPhase(groupId); // may flip straight to live
    }

    return { agreement: getAgreementById(agreement.id), group };
  })();
}

/**
 * Lazy phase transitions, called before any phase-sensitive read or write:
 * - awaiting_signatures past the 7-day deadline without full signatures →
 *   agreement expires, back to setup (regenerate after re-approval).
 * - scheduled and the agreed Round 1 date has arrived → live; the first
 *   round's due date is one cadence interval after the start date.
 */
export function syncGroupPhase(groupId: number): GroupRow {
  const db = getDb();
  let group = getGroup(groupId);
  const now = new Date();

  if (group.phase === "awaiting_signatures") {
    const agreement = getCurrentAgreement(groupId);
    if (
      agreement?.status === "awaiting_signatures" &&
      agreement.signing_deadline &&
      new Date(agreement.signing_deadline).getTime() < now.getTime()
    ) {
      db.prepare("UPDATE group_agreements SET status = 'expired' WHERE id = ?").run(
        agreement.id,
      );
      db.prepare("UPDATE groups SET phase = 'setup' WHERE id = ?").run(groupId);
      group = getGroup(groupId);
    }
  }

  if (group.phase === "scheduled" && group.round1_start_at && group.schedule) {
    const live = canEnterLive({
      allActiveMembersSigned: true,
      round1StartAt: group.round1_start_at,
      now,
    });
    if (live.ok) {
      db.prepare(
        "UPDATE groups SET phase = 'live', round_due_at = ? WHERE id = ?",
      ).run(
        nextDueDate(group.schedule, new Date(group.round1_start_at)).toISOString(),
        groupId,
      );
      group = getGroup(groupId);
    }
  }

  return group;
}
