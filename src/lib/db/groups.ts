import { randomInt } from "node:crypto";
import { getDb } from "./index";
import { nextDueDate } from "./schedule";
import {
  ApiError,
  GroupRow,
  MemberWithUser,
  Schedule,
  UserRow,
} from "./types";

// No 0/O/1/I to keep codes easy to share verbally.
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateInviteCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)];
  }
  return code;
}

/**
 * Create a group. The creator is rotation position 1 and may pre-register
 * the member list in rotation order; those members later "log in" with
 * their name + the group's invite code.
 */
export function createGroup(input: {
  name: string;
  contributionAmount: number;
  schedule: Schedule;
  creatorName: string;
  memberNames?: string[];
}): { group: GroupRow; creator: UserRow } {
  const memberNames = input.memberNames ?? [];
  const allNames = [input.creatorName, ...memberNames].map((n) =>
    n.trim().toLowerCase(),
  );
  if (allNames.some((n) => n === "")) {
    throw new ApiError("Member names must be non-empty strings");
  }
  if (new Set(allNames).size !== allNames.length) {
    throw new ApiError(
      "Member names must be unique within a group (names are how members log in)",
    );
  }

  const db = getDb();
  return db.transaction(() => {
    let inviteCode = generateInviteCode();
    while (
      db.prepare("SELECT 1 FROM groups WHERE invite_code = ?").get(inviteCode)
    ) {
      inviteCode = generateInviteCode();
    }

    const groupId = db
      .prepare(
        `INSERT INTO groups (name, invite_code, contribution_amount, schedule, round_due_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.name,
        inviteCode,
        input.contributionAmount,
        input.schedule,
        nextDueDate(input.schedule).toISOString(),
      ).lastInsertRowid as number;

    const creatorId = addMember(groupId, input.creatorName, inviteCode);
    for (const name of memberNames) {
      addMember(groupId, name.trim(), null);
    }

    return { group: getGroup(groupId), creator: getUser(creatorId) };
  })();
}

/** Create a user and append them to the end of the group's rotation. */
export function addMember(
  groupId: number,
  userName: string,
  inviteCodeUsed: string | null,
): number {
  const db = getDb();
  const userId = db
    .prepare("INSERT INTO users (name, invite_code_used) VALUES (?, ?)")
    .run(userName, inviteCodeUsed).lastInsertRowid as number;

  const nextPosition = (
    db
      .prepare(
        "SELECT COALESCE(MAX(rotation_position), 0) + 1 AS pos FROM group_members WHERE group_id = ?",
      )
      .get(groupId) as { pos: number }
  ).pos;

  db.prepare(
    `INSERT INTO group_members (group_id, user_id, rotation_position)
     VALUES (?, ?, ?)`,
  ).run(groupId, userId, nextPosition);

  return userId;
}

/**
 * Name + invite code is the MVP auth. If the name matches an existing
 * member, this is a login. Otherwise the user is added to the end of the
 * rotation — but only before the rotation starts; mid-cycle joins require
 * an approved 'add_member' poll.
 */
export function joinGroup(input: {
  inviteCode: string;
  userName: string;
}): { group: GroupRow; user: UserRow; joined: boolean } {
  const db = getDb();

  return db.transaction(() => {
    const group = db
      .prepare("SELECT * FROM groups WHERE invite_code = ?")
      .get(input.inviteCode.trim().toUpperCase()) as GroupRow | undefined;
    if (!group) throw new ApiError("Invalid invite code", 404);

    const existing = getMembers(group.id).find(
      (m) => m.name.toLowerCase() === input.userName.trim().toLowerCase(),
    );
    if (existing) {
      const user = getUser(existing.user_id);
      if (!user.invite_code_used) {
        db.prepare("UPDATE users SET invite_code_used = ? WHERE id = ?").run(
          group.invite_code,
          user.id,
        );
        user.invite_code_used = group.invite_code;
      }
      return { group, user, joined: false };
    }

    const rotationStarted =
      group.current_cycle > 1 ||
      group.current_round > 1 ||
      group.cycle_complete === 1 ||
      db
        .prepare("SELECT 1 FROM contributions WHERE group_id = ? LIMIT 1")
        .get(group.id) !== undefined;
    if (rotationStarted) {
      throw new ApiError(
        "This group's rotation has already started. Ask a member to open an 'add_member' poll to join mid-cycle.",
        409,
      );
    }

    const userId = addMember(group.id, input.userName.trim(), group.invite_code);
    return { group, user: getUser(userId), joined: true };
  })();
}

/**
 * Drop out of the rotation. The pot for future rounds shrinks automatically
 * since it is always computed as (active members x contribution amount).
 */
export function leaveGroup(groupId: number, userId: number): void {
  requireActiveMember(groupId, userId);
  getDb()
    .prepare(
      "UPDATE group_members SET active = 0 WHERE group_id = ? AND user_id = ?",
    )
    .run(groupId, userId);
}

export function getGroup(id: number): GroupRow {
  const group = getDb()
    .prepare("SELECT * FROM groups WHERE id = ?")
    .get(id) as GroupRow | undefined;
  if (!group) throw new ApiError("Group not found", 404);
  return group;
}

export function getUser(id: number): UserRow {
  const user = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | UserRow
    | undefined;
  if (!user) throw new ApiError("User not found", 404);
  return user;
}

export function listGroups(): Array<GroupRow & { member_count: number }> {
  return getDb()
    .prepare(
      `SELECT g.*, COUNT(gm.user_id) AS member_count
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id AND gm.active = 1
       GROUP BY g.id
       ORDER BY g.id`,
    )
    .all() as Array<GroupRow & { member_count: number }>;
}

export function getMembers(groupId: number): MemberWithUser[] {
  return getDb()
    .prepare(
      `SELECT gm.*, u.name
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = ?
       ORDER BY gm.rotation_position`,
    )
    .all(groupId) as MemberWithUser[];
}

export function getActiveMembers(groupId: number): MemberWithUser[] {
  return getMembers(groupId).filter((m) => m.active === 1);
}

/**
 * This round's payout recipient: the first active member in rotation order
 * who hasn't received a payout this cycle. Robust to drop-outs — if the
 * next-in-line leaves, the following unpaid member is up.
 */
export function getCurrentRecipient(group: GroupRow): MemberWithUser | null {
  if (group.cycle_complete === 1) return null;
  return (
    getActiveMembers(group.id).find((m) => m.payout_received === 0) ?? null
  );
}

export function requireActiveMember(
  groupId: number,
  userId: number,
): MemberWithUser {
  const member = getActiveMembers(groupId).find((m) => m.user_id === userId);
  if (!member) {
    throw new ApiError("User is not an active member of this group", 403);
  }
  return member;
}
