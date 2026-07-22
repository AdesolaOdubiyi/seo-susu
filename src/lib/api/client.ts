/**
 * Typed fetch client for Next API routes + better-sqlite3.
 * UI calls real endpoints in development. Types come from the DB layer
 * (see docs/CHANGE_RULES.md).
 */

import type { GroupStatus, ContributionResult } from "@/lib/db/contributions";
import type { PollWithVotes } from "@/lib/db/polls";
import type {
  GroupRow,
  UserRow,
  MemberWithUser,
  AgreementRow,
  ChangeType,
} from "@/lib/db/types";
import { getErrorMessage } from "@/lib/ui/errors";

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      isJsonObject(data) && typeof data.error === "string"
        ? data.error
        : `Request failed (${res.status})`;
    throw new Error(getErrorMessage(message));
  }
  return data as T;
}

export function createGroup(input: {
  name: string;
  creatorName: string;
}): Promise<{ group: GroupRow; creator: UserRow; inviteCode: string }> {
  return http("/api/groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function joinGroup(input: {
  inviteCode: string;
  userName: string;
}): Promise<{ group: GroupRow; user: UserRow; joined: boolean }> {
  return http("/api/groups/join", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listGroups(): Promise<{
  groups: Array<GroupRow & { member_count: number }>;
}> {
  return http("/api/groups");
}

export function getGroup(
  groupId: number,
): Promise<{ group: GroupRow; members: MemberWithUser[] }> {
  return http(`/api/groups?id=${groupId}`);
}

export function getStatus(groupId: number): Promise<GroupStatus> {
  return http(`/api/groups/${groupId}/status`);
}

export function contribute(
  groupId: number,
  userId: number,
): Promise<ContributionResult> {
  return http(`/api/groups/${groupId}/contribute`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function leaveGroup(
  groupId: number,
  userId: number,
): Promise<{ left: true; payout: unknown }> {
  return http(`/api/groups/${groupId}/leave`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function getAgreement(groupId: number): Promise<{
  current:
    | (AgreementRow & { terms: unknown; signedBy: number[] })
    | null;
  history: Array<
    Pick<
      AgreementRow,
      | "id"
      | "version"
      | "status"
      | "generated_at"
      | "effective_at"
      | "supersedes_id"
    >
  >;
}> {
  return http(`/api/groups/${groupId}/agreement`);
}

export function signAgreement(
  groupId: number,
  userId: number,
): Promise<{ agreement: AgreementRow; group: GroupRow }> {
  return http(`/api/groups/${groupId}/agreement/sign`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
}

export function listPolls(
  groupId: number,
): Promise<{ polls: PollWithVotes[] }> {
  return http(`/api/polls?groupId=${groupId}`);
}

export function createPoll(input: {
  groupId: number;
  proposedBy: number;
  changeType: ChangeType;
  changeDetails?: unknown;
}): Promise<{ poll: PollWithVotes }> {
  return http("/api/polls", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function votePoll(
  pollId: number,
  userId: number,
  vote: boolean,
): Promise<{ poll: PollWithVotes; payout: unknown }> {
  return http(`/api/polls/${pollId}/vote`, {
    method: "POST",
    body: JSON.stringify({ userId, vote }),
  });
}

export function sendChat(input: {
  groupId: number;
  userId: number;
  message: string;
}): Promise<{
  reply: string;
  sources: Array<{ kind: string; label: string; detail?: string }>;
  agreementMayBeStale: boolean;
  activeAgreementVersion: number | null;
}> {
  return http("/api/chat", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
