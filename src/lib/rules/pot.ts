/** Pot = active members × contribution amount. */

export function calculatePot(
  activeMemberCount: number,
  contributionAmount: number,
): number {
  if (activeMemberCount < 0) {
    throw new Error("activeMemberCount must be >= 0");
  }
  if (!Number.isFinite(contributionAmount) || contributionAmount < 0) {
    throw new Error("contributionAmount must be a finite number >= 0");
  }
  return activeMemberCount * contributionAmount;
}
