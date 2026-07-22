import type { GroupStatus } from "@/lib/db/contributions";

/** Mid-round live group used by all dashboard layout prototypes. */
export const MOCK_GROUP_STATUS: GroupStatus = {
  group: {
    id: 6,
    name: "Sunday Savers",
    inviteCode: "ABC123",
    phase: "live",
    contributionAmount: 50,
    schedule: "weekly",
    round1StartAt: "2026-07-01T12:00:00.000Z",
    currentCycle: 1,
    currentRound: 2,
    cycleComplete: false,
  },
  members: [
    {
      userId: 1,
      name: "Ama",
      rotationPosition: 1,
      active: true,
      payoutReceived: true,
      contributedThisRound: true,
    },
    {
      userId: 2,
      name: "Kofi",
      rotationPosition: 2,
      active: true,
      payoutReceived: false,
      contributedThisRound: true,
    },
    {
      userId: 3,
      name: "Zainab",
      rotationPosition: 3,
      active: true,
      payoutReceived: false,
      contributedThisRound: true,
    },
    {
      userId: 4,
      name: "Malik",
      rotationPosition: 4,
      active: true,
      payoutReceived: false,
      contributedThisRound: false,
    },
    {
      userId: 5,
      name: "Efua",
      rotationPosition: 5,
      active: true,
      payoutReceived: false,
      contributedThisRound: false,
    },
  ],
  currentRecipient: { userId: 2, name: "Kofi" },
  round: {
    contributed: 3,
    expected: 5,
    potAmount: 250,
    deadline: "2026-07-24T12:00:00.000Z",
    daysUntilDeadline: 2,
    stalled: false,
    openPolls: 1,
    payoutBlocked: true,
    payoutBlockedReason: "open_poll:1",
  },
  activeAgreement: {
    id: 1,
    version: 1,
    status: "active",
    contentHash: "proto-hash",
    signingDeadline: null,
    effectiveAt: "2026-07-01T12:00:00.000Z",
    signedBy: [1, 2, 3, 4, 5],
    renderedText:
      "Sunday Savers: Group Agreement (cycle 1, version 1)\n\nEveryone contributes $50 weekly. Payout order: Ama, Kofi, Zainab, Malik, Efua.\n\nPayouts are simulated. This app does not hold, transfer, insure, or guarantee money.",
  },
};

export const MOCK_OPEN_POLL = {
  id: 1,
  changeType: "contribution_amount" as const,
  label: "Contribution amount",
  summary: "Change amount to $60",
  deadlineLabel: "Votes due tomorrow",
  votesFor: 2,
  votesNeeded: 5,
};

export const MOCK_ACTING_USER_ID = 4; // Malik — still pending this round

export const PROTOTYPE_LINKS = [
  {
    href: "/prototypes/dashboard-a",
    name: "Status Strip",
    blurb:
      "Single column with the right order: payout, contribute, open poll, then details.",
  },
  {
    href: "/prototypes/dashboard-b",
    name: "Command Center (shipped)",
    blurb:
      "Two columns on desktop. Now live on real group pages. This route is the reference mock.",
  },
  {
    href: "/prototypes/dashboard-c",
    name: "Tabbed Shell",
    blurb:
      "Sticky header with contribute. Switch Overview, Rotation, Polls, Rules, Chat.",
  },
] as const;
