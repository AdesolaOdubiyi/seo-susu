import { describe, expect, it } from "vitest";
import {
  appendJoinPosition,
  applyLeave,
  canCompleteStartCycle,
  canEnterLive,
  canGenerateAgreement,
  canProposeStartCycle,
  canRecordContribution,
  canSettlePayout,
  calculatePot,
  defaultRound1StartDate,
  eligibleVotersForRemove,
  isPollExpired,
  isStalled,
  nextRecipient,
  payoutBlockedByOpenPolls,
  pollDeadlineDayBefore,
  shouldAutoRejectExpiredPoll,
  validateRemoveMemberDetails,
  validateRotationOrder,
  type PolicyMember,
} from "./index";

const members = (specs: Array<Partial<PolicyMember> & { userId: number }>): PolicyMember[] =>
  specs.map((s, i) => ({
    userId: s.userId,
    name: s.name ?? `U${s.userId}`,
    rotationPosition: s.rotationPosition ?? i + 1,
    active: s.active ?? true,
    payoutReceivedThisCycle: s.payoutReceivedThisCycle ?? false,
  }));

describe("calculatePot", () => {
  it("multiplies active count by amount", () => {
    expect(calculatePot(8, 50)).toBe(400);
    expect(calculatePot(0, 50)).toBe(0);
  });
});

describe("pollDeadlineDayBefore", () => {
  it("uses end of UTC day before due date", () => {
    const deadline = pollDeadlineDayBefore("2026-07-20T15:00:00.000Z");
    expect(deadline.toISOString()).toBe("2026-07-19T23:59:59.999Z");
  });
});

describe("defaultRound1StartDate", () => {
  it("adds 7 UTC calendar days", () => {
    const d = defaultRound1StartDate("2026-07-10T08:00:00.000Z");
    expect(d.toISOString().startsWith("2026-07-17")).toBe(true);
  });
});

describe("payoutBlockedByOpenPolls", () => {
  it("blocks when an open poll is not expired", () => {
    const decision = payoutBlockedByOpenPolls(
      [
        {
          id: 3,
          changeType: "schedule",
          deadline: "2099-01-01T00:00:00.000Z",
          status: "open",
        },
      ],
      "2026-07-17T12:00:00.000Z",
    );
    expect(decision.ok).toBe(true);
    expect(decision.reason).toContain("open_poll:3");
  });

  it("does not block expired open polls", () => {
    const decision = payoutBlockedByOpenPolls(
      [
        {
          id: 3,
          changeType: "schedule",
          deadline: "2020-01-01T00:00:00.000Z",
          status: "open",
        },
      ],
      "2026-07-17T12:00:00.000Z",
    );
    expect(decision.ok).toBe(false);
  });
});

describe("shouldAutoRejectExpiredPoll", () => {
  it("flags open polls past deadline", () => {
    expect(
      shouldAutoRejectExpiredPoll(
        {
          id: 1,
          changeType: "schedule",
          deadline: "2020-01-01T00:00:00.000Z",
          status: "open",
        },
        "2026-01-01T00:00:00.000Z",
      ),
    ).toBe(true);
  });
});

describe("canSettlePayout", () => {
  it("allows settle when all paid and no open polls", () => {
    expect(
      canSettlePayout({
        activeMemberCount: 4,
        allActiveContributed: true,
        cycleComplete: false,
        openPolls: [],
      }).ok,
    ).toBe(true);
  });

  it("blocks when an open poll exists", () => {
    const d = canSettlePayout({
      activeMemberCount: 4,
      allActiveContributed: true,
      cycleComplete: false,
      openPolls: [
        {
          id: 9,
          changeType: "contribution_amount",
          deadline: "2099-01-01T00:00:00.000Z",
          status: "open",
        },
      ],
      now: "2026-07-17T00:00:00.000Z",
    });
    expect(d.ok).toBe(false);
    expect(d.reason).toContain("open_poll");
  });

  it("blocks when contributions missing", () => {
    expect(
      canSettlePayout({
        activeMemberCount: 4,
        allActiveContributed: false,
        cycleComplete: false,
        openPolls: [],
      }).reason,
    ).toBe("missing_contributions");
  });
});

describe("isStalled", () => {
  it("is true past due with missing pays", () => {
    expect(
      isStalled({
        roundDueAt: "2026-07-01T00:00:00.000Z",
        now: "2026-07-02T00:00:00.000Z",
        missingActiveContributions: true,
        cycleComplete: false,
      }),
    ).toBe(true);
  });

  it("is false when everyone paid", () => {
    expect(
      isStalled({
        roundDueAt: "2026-07-01T00:00:00.000Z",
        now: "2026-07-02T00:00:00.000Z",
        missingActiveContributions: false,
        cycleComplete: false,
      }),
    ).toBe(false);
  });
});

describe("canRecordContribution", () => {
  it("allows late contribute while live even if conceptually stalled", () => {
    expect(
      canRecordContribution({
        phase: "live",
        activeMemberCount: 3,
        alreadyContributedThisRound: false,
      }).ok,
    ).toBe(true);
  });

  it("blocks contribute in setup", () => {
    expect(
      canRecordContribution({
        phase: "setup",
        activeMemberCount: 3,
        alreadyContributedThisRound: false,
      }).reason,
    ).toBe("phase_setup");
  });
});

describe("rotation", () => {
  it("picks first active unpaid in order", () => {
    const list = members([
      { userId: 1, rotationPosition: 1, payoutReceivedThisCycle: true },
      { userId: 2, rotationPosition: 2, active: false },
      { userId: 3, rotationPosition: 3 },
    ]);
    expect(nextRecipient(list)?.userId).toBe(3);
  });

  it("validates rotation order", () => {
    expect(validateRotationOrder([1, 2, 3], [1, 2, 3]).ok).toBe(true);
    expect(validateRotationOrder([1, 1, 2], [1, 2, 3]).ok).toBe(false);
  });

  it("appends join after max position", () => {
    const list = members([
      { userId: 1, rotationPosition: 1 },
      { userId: 2, rotationPosition: 5 },
    ]);
    expect(appendJoinPosition(list)).toBe(6);
  });

  it("leave marks inactive and skips in next recipient", () => {
    const after = applyLeave(
      members([
        { userId: 1, rotationPosition: 1 },
        { userId: 2, rotationPosition: 2 },
      ]),
      1,
    );
    expect(after.find((m) => m.userId === 1)?.active).toBe(false);
    expect(nextRecipient(after)?.userId).toBe(2);
    expect(calculatePot(after.filter((m) => m.active).length, 50)).toBe(50);
  });
});

describe("cycle renewal and remove", () => {
  it("requires cycle complete to propose start", () => {
    expect(
      canProposeStartCycle({ cycleComplete: false, proposerIsActive: true })
        .reason,
    ).toBe("cycle_not_complete");
  });

  it("requires unanimous approval and agreement accepts", () => {
    expect(
      canCompleteStartCycle({
        eligibleVoterIds: [1, 2],
        approvedVoterIds: [1, 2],
        agreementAcceptedUserIds: [1],
      }).reason,
    ).toBe("missing_agreement_accept:2");

    expect(
      canCompleteStartCycle({
        eligibleVoterIds: [1, 2],
        approvedVoterIds: [1, 2],
        agreementAcceptedUserIds: [1, 2],
      }).ok,
    ).toBe(true);
  });

  it("validates remove_member details and voters", () => {
    expect(
      validateRemoveMemberDetails(
        {
          targetUserId: 2,
          newAmount: 40,
          newPayoutDate: "2099-01-01T00:00:00.000Z",
        },
        "2026-07-17T00:00:00.000Z",
      ).ok,
    ).toBe(true);
    expect(eligibleVotersForRemove([1, 2, 3], 2)).toEqual([1, 3]);
  });
});

describe("setup gates", () => {
  it("blocks agreement until all approvals exist", () => {
    expect(
      canGenerateAgreement({
        contributionAmountApproved: true,
        cadenceApproved: true,
        rotationOrderApproved: false,
        round1StartDateApproved: true,
      }).reason,
    ).toBe("rotation_not_approved");
  });

  it("enters live only after signatures and round1 date", () => {
    expect(
      canEnterLive({
        allActiveMembersSigned: true,
        round1StartAt: "2026-07-20T12:00:00.000Z",
        now: "2026-07-19T12:00:00.000Z",
      }).reason,
    ).toBe("before_round1_start");

    expect(
      canEnterLive({
        allActiveMembersSigned: true,
        round1StartAt: "2026-07-20T12:00:00.000Z",
        now: "2026-07-20T12:00:00.000Z",
      }).ok,
    ).toBe(true);
  });
});

describe("isPollExpired", () => {
  it("compares to deadline", () => {
    expect(
      isPollExpired("2026-07-19T23:59:59.999Z", "2026-07-20T00:00:00.000Z"),
    ).toBe(true);
  });
});
