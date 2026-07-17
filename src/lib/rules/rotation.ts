import type { PolicyDecision, PolicyMember } from "./types";

function byRotation(a: PolicyMember, b: PolicyMember): number {
  return a.rotationPosition - b.rotationPosition;
}

/** Next recipient: first active member in rotation who has not been paid this cycle. */
export function nextRecipient(
  members: PolicyMember[],
): PolicyMember | null {
  const unpaid = members
    .filter((m) => m.active && !m.payoutReceivedThisCycle)
    .sort(byRotation);
  return unpaid[0] ?? null;
}

/** Active members only, sorted by rotation position. */
export function activeInRotationOrder(
  members: PolicyMember[],
): PolicyMember[] {
  return members.filter((m) => m.active).sort(byRotation);
}

/**
 * Validate a proposed full rotation order (userIds in payout sequence).
 * Must list each proposed member once; positions implied by array index.
 */
export function validateRotationOrder(
  orderedUserIds: number[],
  expectedMemberIds: number[],
): PolicyDecision {
  if (orderedUserIds.length === 0) {
    return { ok: false, reason: "empty_order" };
  }
  if (orderedUserIds.length !== expectedMemberIds.length) {
    return { ok: false, reason: "length_mismatch" };
  }
  const expected = new Set(expectedMemberIds);
  const seen = new Set<number>();
  for (const id of orderedUserIds) {
    if (!expected.has(id)) {
      return { ok: false, reason: `unknown_member:${id}` };
    }
    if (seen.has(id)) {
      return { ok: false, reason: `duplicate:${id}` };
    }
    seen.add(id);
  }
  for (const id of expectedMemberIds) {
    if (!seen.has(id)) {
      return { ok: false, reason: `missing_member:${id}` };
    }
  }
  return { ok: true, reason: "valid" };
}

/** Mid-cycle join: new member appends after the highest existing rotation position. */
export function appendJoinPosition(members: PolicyMember[]): number {
  if (members.length === 0) return 1;
  const max = Math.max(...members.map((m) => m.rotationPosition));
  return max + 1;
}

/** Leave: mark inactive. Pot uses active count elsewhere. Unpaid leavers are skipped by nextRecipient. */
export function applyLeave(
  members: PolicyMember[],
  userId: number,
): PolicyMember[] {
  return members.map((m) =>
    m.userId === userId ? { ...m, active: false } : m,
  );
}
