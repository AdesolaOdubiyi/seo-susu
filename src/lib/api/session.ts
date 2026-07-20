// Demo-simple auth. A "membership" is one identity in one group — because the
// backend creates a fresh user row per group join, a person in two groups has
// two userIds. We track the memberships this device has created/joined in
// localStorage; no cookies or JWTs (see docs/CHANGE_RULES.md: name + invite
// code is the MVP auth).

export interface Membership {
  groupId: number;
  userId: number;
  name: string;
  groupName: string;
}

const KEY = "susu.memberships";

export function getMemberships(): Membership[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Membership[];
  } catch {
    return [];
  }
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
