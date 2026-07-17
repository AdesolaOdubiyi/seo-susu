/**
 * Short general Susu FAQ for chat grounding.
 * Keep in sync with docs/CHANGE_RULES.md
 */
export const GENERAL_SUSU_FAQ = `What is a susu?
A susu is a rotating group savings arrangement. Members of a small trust-based group take turns receiving a shared pot.

What is a round?
In each round, every active member pays the same contribution amount (simulated in this app). One person receives the pot.

What is a cycle?
A cycle is one full pass: keep doing rounds until every active member has received the pot once. Cycle length equals the number of active members.

What is cadence (schedule)?
Cadence is how often a round is due: weekly, biweekly, or monthly. It is not the same as cycle length.

What is the pot?
Pot = active members × contribution amount.

Do polls block payout?
Yes. While a poll is open (and not expired), the round does not pay out. Members can still mark contributions.

What happens if someone is late?
After the due date with missing contributions, status can show stalled. Late contributions are still allowed. This MVP has no penalty.

Is this real money?
This MVP is simulation only. The app does not hold, transfer, insure, or guarantee money.

How do group rules work in chat?
Answers about a specific group use live status first, then that group's signed agreement, then these general rules.`;

export function generalRulesExcerpt(): string {
  return GENERAL_SUSU_FAQ;
}
