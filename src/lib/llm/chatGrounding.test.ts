import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createGroup, getActiveMembers, joinGroup } from "@/lib/db/groups";
import { createPoll, votePoll } from "@/lib/db/polls";
import { signAgreement } from "@/lib/db/agreements";
import { buildChatContext } from "./context";
import { loadActiveAgreement, loadLiveGroupStatus } from "./statusAdapter";

// End-to-end guard for the fix: the chat's second grounding tier (the signed
// agreement) used to be always null because nothing loaded it from the DB.
// This drives a real group through setup and asserts the agreement now reaches
// the chat context. Runs against a throwaway on-disk SQLite database.

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "susu-grounding-"));
  // getDb() reads DATABASE_URL lazily on first use, so setting it here (before
  // any DB call) points the whole suite at a fresh, isolated database.
  process.env.DATABASE_URL = path.join(tmpDir, "test.db");
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function driveGroupToSignedAgreement() {
  const { group, creator } = createGroup({
    name: "Grounding Test",
    creatorName: "Ama",
  });
  joinGroup({ inviteCode: group.invite_code, userName: "Kofi" });
  joinGroup({ inviteCode: group.invite_code, userName: "Zainab" });

  const orderedUserIds = getActiveMembers(group.id).map((m) => m.user_id);
  const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const setupPolls = [
    { changeType: "contribution_amount" as const, changeDetails: { amount: 50 } },
    { changeType: "schedule" as const, changeDetails: { schedule: "weekly" } },
    { changeType: "rotation_order" as const, changeDetails: { orderedUserIds } },
    { changeType: "round1_start_date" as const, changeDetails: { startDate: future } },
  ];
  for (const p of setupPolls) {
    const poll = createPoll({ groupId: group.id, proposedBy: creator.id, ...p });
    for (const uid of orderedUserIds) votePoll(poll.id, uid, true);
  }
  for (const uid of orderedUserIds) signAgreement(group.id, uid);

  return group.id;
}

describe("chat grounding loads the signed agreement from the DB", () => {
  it("loadActiveAgreement returns the group's signed terms", () => {
    const groupId = driveGroupToSignedAgreement();

    const agreement = loadActiveAgreement(groupId);
    expect(agreement).not.toBeNull();
    expect(agreement?.version).toBe(1);
    expect(agreement?.contributionAmount).toBe(50);
    expect(agreement?.cadence).toBe("weekly");
    expect(agreement?.payoutOrder).toHaveLength(3);
    expect(agreement?.contentHash).toBeTruthy();
  });

  it("buildChatContext includes the agreement tier instead of the empty placeholder", () => {
    const groupId = driveGroupToSignedAgreement();

    const ctx = buildChatContext({
      status: loadLiveGroupStatus(groupId),
      activeAgreement: loadActiveAgreement(groupId),
    });

    const section = ctx.sections.find((s) => s.id === "group_agreement");
    expect(section?.body).toContain("Agreement version: 1");
    expect(section?.body).not.toContain("No active agreement");
    expect(ctx.activeAgreementVersion).toBe(1);
  });

  it("returns null for a group that has no agreement yet (still in setup)", () => {
    const { group } = createGroup({ name: "Setup Only", creatorName: "Bola" });
    expect(loadActiveAgreement(group.id)).toBeNull();
  });
});
