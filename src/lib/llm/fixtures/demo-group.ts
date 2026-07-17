import type { AgreementSnapshot, LiveGroupStatus } from "../types";

/** Fixture: live round is stalled; agreement still shows older amount/pot. */
export const fixtureStalledLiveStatus: LiveGroupStatus = {
  groupId: 1,
  groupName: "Friday Circle",
  phase: "live",
  contributionAmount: 40,
  cadence: "weekly",
  currentCycle: 1,
  currentRound: 2,
  roundDueAt: "2026-07-10T12:00:00.000Z",
  pot: 160,
  stalled: true,
  payoutBlocked: true,
  payoutBlockedReason: "open_poll:7",
  nextRecipient: { userId: 2, name: "Abby" },
  members: [
    {
      userId: 1,
      name: "John",
      rotationPosition: 1,
      active: true,
      payoutReceivedThisCycle: true,
      contributedThisRound: true,
    },
    {
      userId: 2,
      name: "Abby",
      rotationPosition: 2,
      active: true,
      payoutReceivedThisCycle: false,
      contributedThisRound: true,
    },
    {
      userId: 3,
      name: "Mike",
      rotationPosition: 3,
      active: true,
      payoutReceivedThisCycle: false,
      contributedThisRound: false,
    },
    {
      userId: 4,
      name: "Lucas",
      rotationPosition: 4,
      active: true,
      payoutReceivedThisCycle: false,
      contributedThisRound: true,
    },
  ],
  openPolls: [
    {
      id: 7,
      changeType: "contribution_amount",
      deadline: "2099-01-01T00:00:00.000Z",
      status: "open",
    },
  ],
};

/** Older signed agreement that disagrees with live amount/pot. */
export const fixtureStaleAgreement: AgreementSnapshot = {
  version: 1,
  cycleNumber: 1,
  effectiveAt: "2026-07-01T12:00:00.000Z",
  contentHash: "fixture-hash-v1",
  groupName: "Friday Circle",
  contributionAmount: 50,
  cadence: "weekly",
  expectedPot: 200,
  round1StartAt: "2026-07-01T12:00:00.000Z",
  payoutOrder: [
    { userId: 1, name: "John", rotationPosition: 1 },
    { userId: 2, name: "Abby", rotationPosition: 2 },
    { userId: 3, name: "Mike", rotationPosition: 3 },
    { userId: 4, name: "Lucas", rotationPosition: 4 },
  ],
  simulationDisclaimer:
    "Payouts are simulated. This app does not hold, transfer, insure, or guarantee money.",
};

export const fixtureHealthyLiveStatus: LiveGroupStatus = {
  ...fixtureStalledLiveStatus,
  contributionAmount: 50,
  pot: 200,
  stalled: false,
  payoutBlocked: false,
  payoutBlockedReason: null,
  roundDueAt: "2099-08-01T12:00:00.000Z",
  openPolls: [],
  members: fixtureStalledLiveStatus.members.map((m) => ({
    ...m,
    contributedThisRound: true,
  })),
};
