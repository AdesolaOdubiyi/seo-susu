import { describe, expect, it } from "vitest";
import { toLiveGroupStatus } from "./statusAdapter";
import type { GroupStatus } from "@/lib/db/contributions";

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
