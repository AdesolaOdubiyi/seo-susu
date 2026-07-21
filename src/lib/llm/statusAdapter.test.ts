import { describe, expect, it } from "vitest";
import { agreementSnapshotFromRow, toLiveGroupStatus } from "./statusAdapter";
import type { GroupStatus } from "@/lib/db/contributions";
import type { AgreementRow } from "@/lib/db/types";

const baseStatus: GroupStatus = {
  group: {
    id: 1,
    name: "Friday Circle",
    inviteCode: "ABC123",
    phase: "live",
    contributionAmount: 50,
    schedule: "weekly",
    round1StartAt: "2026-07-13T12:00:00.000Z",
    currentCycle: 1,
    currentRound: 2,
    cycleComplete: false,
  },
  members: [
    {
      userId: 1,
      name: "John",
      rotationPosition: 1,
      active: true,
      payoutReceived: true,
      contributedThisRound: true,
    },
    {
      userId: 2,
      name: "Abby",
      rotationPosition: 2,
      active: true,
      payoutReceived: false,
      contributedThisRound: false,
    },
  ],
  currentRecipient: { userId: 2, name: "Abby" },
  round: {
    contributed: 1,
    expected: 2,
    potAmount: 100,
    deadline: "2026-07-20T12:00:00.000Z",
    daysUntilDeadline: 2,
    stalled: false,
    openPolls: 1,
    payoutBlocked: true,
    payoutBlockedReason: "open_poll:9",
  },
  activeAgreement: null,
};

describe("toLiveGroupStatus", () => {
  it("marks payout blocked when open polls exist", () => {
    const live = toLiveGroupStatus(
      baseStatus,
      [
        {
          id: 9,
          changeType: "schedule",
          deadline: "2099-01-01T00:00:00.000Z",
          status: "open",
        },
      ],
      new Date("2026-07-17T12:00:00.000Z"),
    );
    expect(live.payoutBlocked).toBe(true);
    expect(live.payoutBlockedReason).toContain("open_poll");
    expect(live.nextRecipient?.name).toBe("Abby");
    expect(live.cadence).toBe("weekly");
    expect(live.phase).toBe("live");
  });

  it("does not block payout when there are no open polls", () => {
    const live = toLiveGroupStatus(
      baseStatus,
      [],
      new Date("2026-07-17T12:00:00.000Z"),
    );
    expect(live.payoutBlocked).toBe(false);
    expect(live.payoutBlockedReason).toBeNull();
  });
});

describe("agreementSnapshotFromRow", () => {
  // terms_json deliberately carries different version/cycle numbers than the
  // row, to prove those fields are sourced from the row, not the JSON.
  const termsJson = JSON.stringify({
    groupId: 1,
    groupName: "Friday Circle",
    cycleNumber: 99,
    version: 99,
    members: [
      { userId: 1, name: "John", rotationPosition: 1 },
      { userId: 2, name: "Abby", rotationPosition: 2 },
    ],
    contributionAmount: 50,
    cadence: "weekly",
    expectedPot: 100,
    round1StartDate: "2026-07-13T12:00:00.000Z",
    rules: { late: "…" },
    disclaimer: "Simulated payouts only.",
  });

  const row: AgreementRow = {
    id: 9,
    group_id: 1,
    cycle_number: 1,
    version: 2,
    status: "active",
    terms_json: termsJson,
    rendered_text: "Friday Circle — Group Agreement …",
    content_hash: "hash-xyz",
    generated_at: "2026-07-10T00:00:00.000Z",
    signing_deadline: null,
    effective_at: "2026-07-13T12:00:00.000Z",
    supersedes_id: 1,
  };

  it("sources version, cycle, effectiveAt, and contentHash from the row", () => {
    const snap = agreementSnapshotFromRow(row);
    expect(snap.version).toBe(2);
    expect(snap.cycleNumber).toBe(1);
    expect(snap.effectiveAt).toBe("2026-07-13T12:00:00.000Z");
    expect(snap.contentHash).toBe("hash-xyz");
  });

  it("maps renamed terms_json fields (members→payoutOrder, round1StartDate→round1StartAt, disclaimer→simulationDisclaimer)", () => {
    const snap = agreementSnapshotFromRow(row);
    expect(snap.payoutOrder).toHaveLength(2);
    expect(snap.payoutOrder[0]).toEqual({
      userId: 1,
      name: "John",
      rotationPosition: 1,
    });
    expect(snap.round1StartAt).toBe("2026-07-13T12:00:00.000Z");
    expect(snap.simulationDisclaimer).toBe("Simulated payouts only.");
    expect(snap.groupName).toBe("Friday Circle");
    expect(snap.contributionAmount).toBe(50);
    expect(snap.cadence).toBe("weekly");
    expect(snap.expectedPot).toBe(100);
  });
});
