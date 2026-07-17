import type { OpenPollSummary, PolicyDecision } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** UTC calendar date parts. */
export function utcYmd(d: Date): { y: number; m: number; day: number } {
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    day: d.getUTCDate(),
  };
}

/** End of a UTC calendar day (23:59:59.999Z). */
export function endOfUtcDay(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m, day, 23, 59, 59, 999));
}

/**
 * Poll deadline = end of the UTC calendar day before `roundDueAt`.
 * Example: due 2026-07-20T15:00:00Z → deadline 2026-07-19T23:59:59.999Z
 */
export function pollDeadlineDayBefore(roundDueAt: Date | string): Date {
  const due = typeof roundDueAt === "string" ? new Date(roundDueAt) : roundDueAt;
  if (Number.isNaN(due.getTime())) {
    throw new Error("roundDueAt must be a valid date");
  }
  const { y, m, day } = utcYmd(due);
  // Day before in UTC
  const dayBefore = new Date(Date.UTC(y, m, day - 1));
  const parts = utcYmd(dayBefore);
  return endOfUtcDay(parts.y, parts.m, parts.day);
}

/** Default Round 1 start proposal: +7 UTC calendar days from `from`. */
export function defaultRound1StartDate(from: Date | string = new Date()): Date {
  const start = typeof from === "string" ? new Date(from) : from;
  if (Number.isNaN(start.getTime())) {
    throw new Error("from must be a valid date");
  }
  const { y, m, day } = utcYmd(start);
  return new Date(Date.UTC(y, m, day + 7, 12, 0, 0, 0));
}

/** Setup start-date / agreement / renewal proposal windows: 7 days. */
export function proposalExpiresAt(
  openedAt: Date | string,
  days = 7,
): Date {
  const opened = typeof openedAt === "string" ? new Date(openedAt) : openedAt;
  if (Number.isNaN(opened.getTime())) {
    throw new Error("openedAt must be a valid date");
  }
  return new Date(opened.getTime() + days * MS_PER_DAY);
}

export function isPollExpired(
  deadline: Date | string,
  now: Date | string = new Date(),
): boolean {
  const d = typeof deadline === "string" ? new Date(deadline) : deadline;
  const n = typeof now === "string" ? new Date(now) : now;
  if (Number.isNaN(d.getTime()) || Number.isNaN(n.getTime())) {
    throw new Error("deadline and now must be valid dates");
  }
  return n.getTime() > d.getTime();
}

/** Open polls (status === open and not past deadline) block payout. */
export function payoutBlockedByOpenPolls(
  polls: OpenPollSummary[],
  now: Date | string = new Date(),
): PolicyDecision {
  const blocking = polls.filter(
    (p) => p.status === "open" && !isPollExpired(p.deadline, now),
  );
  if (blocking.length === 0) {
    return { ok: false, reason: "no_open_polls" };
  }
  return {
    ok: true,
    reason: `open_poll:${blocking.map((p) => p.id).join(",")}`,
  };
}

export function shouldAutoRejectExpiredPoll(
  poll: OpenPollSummary,
  now: Date | string = new Date(),
): boolean {
  return poll.status === "open" && isPollExpired(poll.deadline, now);
}
