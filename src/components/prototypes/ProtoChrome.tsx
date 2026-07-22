import Link from "next/link";
import type { ReactNode } from "react";
import { payoutPausedMessage } from "@/lib/ui/labels";
import {
  MOCK_ACTING_USER_ID,
  MOCK_GROUP_STATUS,
  MOCK_OPEN_POLL,
} from "@/lib/prototypes/mockStatus";

export function ProtoChrome({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="border-b border-[var(--line)] bg-[var(--surface)]/80 px-4 py-2 text-xs text-[var(--muted)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/prototypes" className="hover:text-[var(--ink)]">
            ← Prototypes
          </Link>
          <span className="font-medium text-[var(--ink-soft)]">{title}</span>
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]">
            Mock data
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function ProtoHeader() {
  const { group } = MOCK_GROUP_STATUS;
  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          {group.name}
        </h1>
        <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
          In progress
        </span>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Cycle {group.currentCycle} · Round {group.currentRound} · $
        {group.contributionAmount}/weekly
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Invite{" "}
        <span className="font-mono tracking-wider text-[var(--ink)]">
          {group.inviteCode}
        </span>
      </p>
    </header>
  );
}

export function ProtoPayoutHero() {
  const { currentRecipient, round } = MOCK_GROUP_STATUS;
  return (
    <section className="rounded-2xl bg-[var(--ink)] p-5 text-[var(--paper)]">
      <p className="text-sm text-white/60">This round&apos;s payout</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
        {currentRecipient?.name}
      </p>
      <p className="mt-1 text-lg tabular-nums">receives ${round.potAmount}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="text-white/60">
          <span className="tabular-nums">{round.contributed}</span> of{" "}
          <span className="tabular-nums">{round.expected}</span> paid
        </span>
        <span className="text-white/70">
          Due in {round.daysUntilDeadline} days
        </span>
      </div>
      {round.payoutBlocked && (
        <p className="mt-3 rounded-lg bg-white/10 p-2 text-xs text-[#f7ece5]">
          {payoutPausedMessage(round.payoutBlockedReason)}
        </p>
      )}
    </section>
  );
}

export function ProtoContributeButton() {
  const amount = MOCK_GROUP_STATUS.group.contributionAmount;
  const member = MOCK_GROUP_STATUS.members.find(
    (m) => m.userId === MOCK_ACTING_USER_ID,
  );
  const done = member?.contributedThisRound;
  return (
    <button
      type="button"
      disabled={done}
      className="btn-press w-full rounded-2xl bg-[var(--accent)] py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:text-[var(--muted)]"
    >
      {done ? "You contributed this round" : `Mark my $${amount} as sent`}
    </button>
  );
}

export function ProtoPollAlert() {
  const poll = MOCK_OPEN_POLL;
  return (
    <section className="rounded-2xl border border-[var(--warn)]/30 bg-[var(--warn-soft)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--warn)]">
        Vote needed
      </p>
      <p className="mt-1 font-semibold text-[var(--ink)]">{poll.summary}</p>
      <p className="mt-1 text-xs text-[var(--ink-soft)]">
        {poll.label} · {poll.votesFor}/{poll.votesNeeded} approved ·{" "}
        {poll.deadlineLabel}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn-press rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Approve
        </button>
        <button
          type="button"
          className="btn-press rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink)]"
        >
          Reject
        </button>
      </div>
    </section>
  );
}

export function ProtoRotationStrip() {
  const { members, currentRecipient } = MOCK_GROUP_STATUS;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {members.map((m) => {
        const isUp = currentRecipient?.userId === m.userId;
        return (
          <div
            key={m.userId}
            className={`flex min-w-[4.5rem] flex-col items-center rounded-2xl border px-2 py-2 ${
              isUp
                ? "border-[var(--ink)] bg-[var(--surface)]"
                : "border-[var(--line)] bg-[var(--surface)]"
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold">
              {m.rotationPosition}
            </span>
            <span className="mt-1 max-w-full truncate text-xs font-medium">
              {m.name}
            </span>
            <span className="text-[10px] text-[var(--muted)]">
              {m.contributedThisRound ? "paid" : "pending"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function ProtoRotationList() {
  const { members, currentRecipient } = MOCK_GROUP_STATUS;
  return (
    <ul className="space-y-2">
      {members.map((m) => {
        const isUp = currentRecipient?.userId === m.userId;
        return (
          <li
            key={m.userId}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              isUp
                ? "border-[var(--ink)] bg-[var(--surface)]"
                : "border-[var(--line)] bg-[var(--surface)]"
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-sm font-medium">
              {m.rotationPosition}
            </span>
            <span className="flex-1 font-medium">
              {m.name}
              {isUp && (
                <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                  · up next
                </span>
              )}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {m.payoutReceived
                ? "paid out"
                : m.contributedThisRound
                  ? "contributed"
                  : "pending"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ProtoRulesSnippet() {
  const text = MOCK_GROUP_STATUS.activeAgreement?.renderedText ?? "";
  return (
    <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-3 font-sans text-xs text-[var(--ink-soft)]">
      {text}
    </pre>
  );
}

export function ProtoChatSnippet() {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="text-sm text-[var(--muted)]">
        Try: &quot;Who gets paid next?&quot;
      </p>
      <div className="mr-8 rounded-2xl bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--ink-soft)]">
        Kofi receives $250 this round. Payout waits until the open vote closes
        and Malik and Efua mark their contributions.
      </div>
      <div className="flex gap-2">
        <input
          disabled
          placeholder="Ask about this susu…"
          className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled
          className="rounded-xl bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--paper)] opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export function ProtoViewingAs() {
  const { members } = MOCK_GROUP_STATUS;
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="mb-2 text-xs font-medium text-[var(--muted)]">Viewing as</p>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <span
            key={m.userId}
            className={`rounded-full px-3 py-1 text-sm ${
              m.userId === MOCK_ACTING_USER_ID
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
            }`}
          >
            {m.name}
          </span>
        ))}
      </div>
    </div>
  );
}
