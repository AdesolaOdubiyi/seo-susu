/**
 * Short general Susu FAQ for chat grounding.
 * Keep in sync with docs/CHANGE_RULES.md. Plain language only.
 */
export const GENERAL_SUSU_FAQ = `What is a susu?
A susu is a savings circle. People who trust each other put in the same amount on a regular schedule. Each round, one person receives the whole pot. You keep going until everyone has had their turn.

What is a round?
In each round, every active member pays in. One person receives the pot.

What is a cycle?
A cycle is one full pass. Rounds continue until every active member has received the pot once. If more people join, the cycle gets longer.

How often do we contribute?
The group picks weekly, every two weeks, or monthly when they set things up. They can change it later if everyone agrees.

What is the pot?
The pot is the number of active members times the contribution amount.

Do group votes stop a payout?
Yes. While a vote is still open, the payout waits. People can still mark their contribution as sent.

What if someone is late?
After the due date, the round may show as overdue. Late contributions are still allowed. This app does not add penalties.

Does this app move real money?
No. This version is for practice and tracking. It does not hold, transfer, insure, or guarantee money.

How should you answer questions?
Use the latest group details first. Then use this group's signed agreement. Use these general notes only for “what is a susu” style questions. Speak in plain words. Use people's names. Do not mention IDs, codes, or technical field names.`;

export function generalRulesExcerpt(): string {
  return GENERAL_SUSU_FAQ;
}
