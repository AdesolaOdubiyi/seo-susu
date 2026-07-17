# Susu change rules

Shared contract for backend, frontend, and LLM work. If UI copy, API behavior, or chat answers disagree with this file, fix the code. Do not invent a parallel rule set.

**Scope:** New York simulation MVP. No real money moves through the app. Auth is name + invite code.

**Dates:** Use UTC calendar days for the demo.

---

## Who owns what

| Role | Owns |
|------|------|
| **LLM (Person B)** | This doc. Pure policy helpers/tests that encode these rules. `/api/chat` grounded in live status + group agreement + this doc. |
| **Backend (Person A)** | SQLite, migrations, routes, wiring policies into transactions. Group lifecycle, polls, agreements tables, status payloads. |
| **Frontend (Person C)** | Setup wizard, confirm/sign screens, live dashboard, Rules & Agreement page, chat widget UI. |

Person B may ship policy functions with reason codes (`canSettlePayout`, `getPollDeadline`, etc.). Person A calls those from DB/route code. Person B does not own migrations, auth middleware, or the full setup API surface.

---

## Words we use

| Term | Meaning |
|------|---------|
| **Cadence / schedule** | How often a round is due: `weekly`, `biweekly`, or `monthly`. |
| **Round** | Everyone active pays in once. One person gets the pot. |
| **Cycle** | Keep doing rounds until every active member has received once. Length = active member count. |
| **Pot** | `active members × contribution amount`. |
| **Organizer** | Person who creates the group and opens setup. No special powers after the group is live. |
| **Group Agreement** | Versioned terms snapshot members sign. Structured JSON is the source of truth; prose is rendered from it. |

Cadence is not cycle length. Eight people on a weekly cadence take about eight weeks for one cycle because there are eight rounds, not because “8 weeks” is a schedule setting.

---

## How one round works

1. Every **active** member marks their contribution for the current round (simulated).
2. Late contributions are allowed after the due date. Status may show **stalled**. No penalty this week.
3. When every active member has contributed **and** there is **no open poll**, the app simulates payout to the next unpaid person in rotation.
4. Pot shrinks or grows with active membership. An unpaid leaver is skipped. Mid-cycle joins append to the end of the rotation.

Open polls **block payout**. Members can still mark contributions while a poll is open.

---

## Setup (before any contributions)

Contributions stay blocked until the group is live.

1. Friends pick an organizer offline (WhatsApp is fine).
2. Organizer creates an empty group and shares the invite code.
3. Members join with name + invite code. Group exists; susu has not started.
4. Setup proposals (unanimous):
   - Contribution amount
   - Cadence (`weekly` / `biweekly` / `monthly`)
   - Payout order (see below)
   - Round 1 start date (see below)
5. App generates the Group Agreement from those approved facts.
6. Every active member signs within **7 days**.
7. Group waits until the **agreed** Round 1 date, then goes live.

### Offline-first tip (frontend)

On organizer setup screens, show a short tip (not a hard block):

> Most groups finish faster if you already agreed on WhatsApp. Enter what you decided here so everyone can just confirm.

In-app propose / randomize stays available if they did not decide offline.

### Payout order (both paths)

Either path still needs **unanimous confirm**:

1. **Offline-decided:** Organizer enters the order. That is a proposal for confirmation, not a unilateral write. Members must approve so the organizer cannot rewrite the order quietly.
2. **In-app:** Someone proposes a full list or clicks Randomize. Everyone must approve that exact list.

No first-come slot claiming. Mid-cycle full reorder is out of scope unless we add an explicit `reorder` poll later.

### Round 1 start date

- Organizer proposes the date.
- Default: **7 days** from when the start-date proposal opens.
- Custom date is allowed.
- Members have **7 days** to unanimously agree.
- Reject or expire: stay in setup; organizer may propose again.
- Cool-down after signing waits for this agreed date (not a separate fixed delay after the last signature).

---

## Polls (live group)

| Field | Rule |
|-------|------|
| Who can create | Any active member |
| Types | `contribution_amount`, `schedule`, `add_member`, `remove_member`, `start_cycle` |
| Setup types | terms / amount / cadence, `rotation_order`, `round1_start_date` |
| Approval | Unanimous among eligible voters. Target of `remove_member` cannot vote on their own removal. |
| Deadline | Calendar **day before** the current round due date (UTC for demo) |
| On expiry | Auto-reject. Old terms stay. Payout unblocks if contributions are complete. |
| While open | Contribute allowed. Payout / round advance blocked. |

Cadence can change later via a `schedule` poll. Same deadline and payout-block rules apply.

### Leave vs remove

| Action | How | Effect |
|--------|-----|--------|
| **Leave** | Member opts out immediately | Inactive. Pot shrinks. Skipped in rotation. |
| **Remove** | Unanimous poll | Needs new contribution amount + new payout date. Deactivate target, try settle under old terms if possible, then apply new amount/date. |

Keep both. Chat and UI must explain the difference in plain language.

### Mid-cycle join

After rotation has started, join requires an approved `add_member` poll. New member goes to the end of the rotation. If the current round is unsettled, they must contribute for that round.

### Next cycle

Nobody starts Cycle 2 alone.

1. Current cycle completes when every active member has received once.
2. Someone proposes `start_cycle`.
3. Every active member must approve and accept the current Group Agreement version.
4. On full approval: cycle increments, round resets to 1, payout flags reset.
5. Suggest a **7-day** expiry on the renewal proposal. Expiry has no money side effect; someone can propose again.

---

## Group Agreement

Generate only after amount, cadence, rotation order, and Round 1 date are approved.

Store an immutable structured snapshot. Render human-readable text from that snapshot. Do not ask the LLM to parse prose back into rules.

Suggested tables:

- `group_agreements`: `id`, `group_id`, `cycle_number`, `version`, `status`, `terms_json`, `rendered_text`, `content_hash`, `generated_at`, `signing_deadline`, `effective_at`, `supersedes_id`
- `agreement_acceptances`: `agreement_id`, `user_id`, `accepted_at`, `agreement_hash` (unique per agreement + member)

`terms_json` holds: members, payout order, amount, cadence, expected pot, Round 1 date, leave/remove/poll/late rules, simulation disclaimer.

Never mutate a signed agreement. An approved change creates a **new version** that supersedes the old one. Keep history.

### What the agreement must say (plain language)

- Who is in, payout order, amount, cadence, expected pot
- How joins/leaves change cycle length and pot
- Simulated payouts only; app does not hold, transfer, insure, or guarantee money
- Late payment / stalled / poll / leave / remove / renewal rules
- No promised profit; not risk-free
- Signing records consent to these simulated rules; it is not “scam protection”

### Group page: Rules & Agreement

On group detail, show:

- Current rules summary
- Payout order and current cycle/round
- Active agreement, who signed, effective date, downloadable copy
- Prior versions / approved changes
- Entry point to ask chat about these rules

Status API should expose `activeAgreement` (and history) for members of that group.

---

## LLM grounding

Context order (strict):

1. Live group status from SQLite (who paid, stalled, open polls, next recipient, `payoutBlocked`)
2. Active structured agreement snapshot for that group
3. This document / general Susu FAQ

If live status and an old agreement disagree, live status wins. Say the agreement may be outdated. Do not invent a quiet fix.

The chat answers:

- This group: who’s next, who owes, when I get paid, why payout is blocked, what we signed
- General: what a susu / round / cycle / cadence / poll is

The chat does not invent poll types or interpret free-form “change requests” into types. UI picks `change_type`.

---

## Suggested branch order

1. **`docs/change-rules`** — this file (land first so everyone shares one contract)
2. **Backend** — lifecycle, polls, agreements, wire policies, status fields
3. **Frontend** — setup, Rules & Agreement, dashboard, chat UI
4. **LLM** — `/api/chat` using status + agreement + this file
5. **Polish** — reminders, empty states, demo fixes

Backend and frontend can start from this doc now. LLM accuracy depends on status + agreement APIs matching these rules.

---

## Gaps vs current code (for backend)

Today’s code still differs in places. Align to this file:

| This file | Code today |
|-----------|------------|
| Poll deadline = day before due | Defaults to due date; expiry not enforced |
| Open polls block payout | Polls never block payout |
| Phased setup before live | Create can put terms live immediately |
| Rotation dual-path + unanimous confirm | Creator position 1; joiners append |
| Round 1 date proposed (+7d default), 7-day agree | Due date set at create from cadence |
| Unanimous `start_cycle` + re-sign | Any active member can start next cycle alone |
| Versioned agreements + acceptances | No agreement tables |

---

## Still small / agreed defaults

- Leave and remove both stay.
- UTC for day-before and Round 1 date math in the demo.
- Simulation only in New York for this phase. Real money is a later legal/product phase.
