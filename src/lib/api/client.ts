// Thin typed fetch client over the real API routes.
//
// The backend runs in-process (Next API routes + better-sqlite3), so the UI
// talks to real endpoints in dev — no mock. Types are imported straight from
// the backend so there is a single source of truth (see docs/CHANGE_RULES.md).

import type { GroupStatus, ContributionResult } from "@/lib/db/contributions";
import type { PollWithVotes } from "@/lib/db/polls";
import type {
  GroupRow,
  UserRow,
  MemberWithUser,
  AgreementRow,
  ChangeType,
} from "@/lib/db/types";

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string })?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

// ---- Groups ----------------------------------------------------------------

export function createGroup(input: { name: string; creatorName: string }) {
  return http<{ group: GroupRow; creator: UserRow; inviteCode: string }>(
    "/api/groups",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function joinGroup(input: { inviteCode: string; userName: string }) {
  return http<{ group: GroupRow; user: UserRow; joined: boolean }>(
    "/api/groups/join",
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function listGroups() {
  return http<{ groups: Array<GroupRow & { member_count: number }> }>(
    "/api/groups",
  );
}

export function getGroup(groupId: number) {
  return http<{ group: GroupRow; members: MemberWithUser[] }>(
    `/api/groups?id=${groupId}`,
  );
}

export function getStatus(groupId: number) {
  return http<GroupStatus>(`/api/groups/${groupId}/status`);
}

export function contribute(groupId: number, userId: number) {
  return http<ContributionResult>(`/api/groups/${groupId}/contribute`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function leaveGroup(groupId: number, userId: number) {
  return http<{ left: true; payout: unknown }>(`/api/groups/${groupId}/leave`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

// ---- Agreement -------------------------------------------------------------

export function getAgreement(groupId: number) {
  return http<{
    current:
      | (AgreementRow & { terms: unknown; signedBy: number[] })
      | null;
    history: Array<Pick<AgreementRow, "id" | "version" | "status" | "generated_at" | "effective_at" | "supersedes_id">>;
  }>(`/api/groups/${groupId}/agreement`);
}

export function signAgreement(groupId: number, userId: number) {
  return http<{ agreement: AgreementRow; group: GroupRow }>(
    `/api/groups/${groupId}/agreement/sign`,
    { method: "POST", body: JSON.stringify({ userId }) },
  );
}

// ---- Polls -----------------------------------------------------------------

export function listPolls(groupId: number) {
  return http<{ polls: PollWithVotes[] }>(`/api/polls?groupId=${groupId}`);
}

export function createPoll(input: {
  groupId: number;
  proposedBy: number;
  changeType: ChangeType;
  changeDetails?: unknown;
}) {
  return http<{ poll: PollWithVotes }>("/api/polls", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function votePoll(pollId: number, userId: number, vote: boolean) {
  return http<{ poll: PollWithVotes; payout: unknown }>(
    `/api/polls/${pollId}/vote`,
    { method: "POST", body: JSON.stringify({ userId, vote }) },
  );
}

// ---- Chat (Person B) -------------------------------------------------------

export function sendChat(input: {
  groupId: number;
  userId: number;
  message: string;
}) {
  return http<{
    reply: string;
    sources: Array<{ kind: string; label: string; detail?: string }>;
    agreementMayBeStale: boolean;
    activeAgreementVersion: number | null;
  }>("/api/chat", { method: "POST", body: JSON.stringify(input) });
}
