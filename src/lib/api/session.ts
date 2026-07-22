// Device-local membership store for the MVP.
//
// Joining a group creates a fresh user row, so one person in two groups has
// two userIds. This module tracks identities created or joined on this device
// in localStorage. No cookies or JWTs. Auth for the MVP is name + invite code
// (docs/CHANGE_RULES.md).

export interface Membership {
  groupId: number;
  userId: number;
  name: string;
  groupName: string;
}

const KEY = "susu.memberships";

function parseMemberships(raw: string | null): Membership[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isMembership);
  } catch {
    return [];
  }
}

function isMembership(value: unknown): value is Membership {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.groupId === "number" &&
    typeof row.userId === "number" &&
    typeof row.name === "string" &&
    typeof row.groupName === "string"
  );
}

export function getMemberships(): Membership[] {
  if (typeof window === "undefined") return [];
  return parseMemberships(window.localStorage.getItem(KEY));
}

export function getMembership(groupId: number): Membership | null {
  return getMemberships().find((m) => m.groupId === groupId) ?? null;
}

/** Add or replace the membership for a group. */
export function saveMembership(m: Membership): void {
  if (typeof window === "undefined") return;
  const next = [...getMemberships().filter((x) => x.groupId !== m.groupId), m];
  window.localStorage.setItem(KEY, JSON.stringify(next));
}

export function removeMembership(groupId: number): void {
  if (typeof window === "undefined") return;
  const next = getMemberships().filter((m) => m.groupId !== groupId);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
