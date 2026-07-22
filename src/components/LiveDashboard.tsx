"use client";

import { useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import type { PollWithVotes } from "@/lib/db/polls";
import { contribute, leaveGroup } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/ui/errors";
import { payoutPausedMessage } from "@/lib/ui/labels";
import { PhaseBadge } from "./PhaseBadge";
import { LivePollsPanel } from "./LivePollsPanel";
import { RulesPanel } from "./RulesPanel";
import { ChatPanel } from "./ChatPanel";

type SideTab = "rules" | "chat";

/** Live Command Center: payout + action primary; rotation rail; rules/chat tabs. */
export function LiveDashboard({
  status,
  polls,
  actingUserId,
  setActingUserId,
  refresh,
}: {
  status: GroupStatus;
  polls: PollWithVotes[];
  actingUserId: number | null;
  setActingUserId: (id: number) => void;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [sideTab, setSideTab] = useState<SideTab>("rules");

  const { group, members, currentRecipient, round } = status;
  const actingMember = members.find((m) => m.userId === actingUserId);
  const canContribute =
    group.phase === "live" &&
    !!actingMember?.active &&
    !actingMember?.contributedThisRound;

  const onContribute = async () => {
    if (!actingUserId) return;
    setBusy(true);
    try {
      const result = await contribute(group.id, actingUserId);
      if (result.payout) {
        setFlash(
          `${result.payout.recipient.name} received $${result.payout.amount}` +
            (result.payout.cycleComplete
              ? ". Cycle complete."
              : ". Next round starts."),
        );
      } else if (result.waitingOnPoll) {
        setFlash(
          "Everyone has contributed. An open vote is holding the payout.",
        );
      }
      await refresh();
    } catch (e) {
      setFlash(getErrorMessage(e));
    } finally {
      setBusy(false);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  const onLeave = async () => {
    if (!actingUserId) return;
    if (
      !window.confirm(
        "Leave this susu? You will be skipped in the rotation and the pot will shrink.",
      )
    ) {
      return;
    }
    setLeaveBusy(true);
    try {
      await leaveGroup(group.id, actingUserId);
      await refresh();
      setFlash("You left the group.");
    } catch (e) {
      setFlash(getErrorMessage(e));
    } finally {
      setLeaveBusy(false);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  const header = (
    <header>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          {group.name}
        </h1>
        <PhaseBadge phase={group.phase} />
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Cycle {group.currentCycle} · Round {group.currentRound} · $
        <span className="tabular-nums">{group.contributionAmount}</span>/
        {group.schedule === "biweekly"
          ? "every 2 weeks"
          : group.schedule || "schedule TBD"}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Invite{" "}
        <span className="font-mono tracking-wider text-[var(--ink)]">
          {group.inviteCode}
        </span>
      </p>
    </header>
  );

  const payoutHero = (
    <section className="rounded-2xl bg-[var(--ink)] p-5 text-[var(--paper)]">
      <p className="text-sm text-white/60">This round&apos;s payout</p>
      {currentRecipient ? (
        <>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            {currentRecipient.name}
          </p>
          <p className="mt-1 text-lg tabular-nums">
            receives ${round.potAmount}
          </p>
        </>
      ) : (
        <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
          Cycle finished
        </p>
      )}
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="text-white/60">
          <span className="tabular-nums">{round.contributed}</span> of{" "}
          <span className="tabular-nums">{round.expected}</span> paid this round
        </span>
        <span className={round.stalled ? "text-[#f5d0a8]" : "text-white/70"}>
          {round.stalled
            ? "Overdue. Still waiting on contributions."
            : `Due in ${round.daysUntilDeadline} day(s)`}
        </span>
      </div>
      {round.payoutBlocked && (
        <p className="mt-3 rounded-lg bg-white/10 p-2 text-xs text-[#f7ece5]">
          {payoutPausedMessage(round.payoutBlockedReason)}
        </p>
      )}
    </section>
  );

  const contributeButton =
    group.phase === "live" ? (
      <button
        type="button"
        onClick={onContribute}
        disabled={!canContribute || busy}
        className="btn-press w-full rounded-2xl bg-[var(--accent)] py-3.5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-[var(--surface-2)] disabled:text-[var(--muted)]"
      >
        {actingMember?.contributedThisRound
          ? "You contributed this round"
          : busy
            ? "Sending…"
            : `Mark my $${group.contributionAmount} as sent`}
      </button>
    ) : null;

  const rotationList = (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        Rotation
      </h2>
      <ul className="space-y-2">
        {members.map((m) => {
          const isRecipient = currentRecipient?.userId === m.userId;
          return (
            <li
              key={m.userId}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                isRecipient
                  ? "border-[var(--ink)] bg-[var(--surface)]"
                  : "border-[var(--line)] bg-[var(--surface)]"
              } ${!m.active ? "opacity-50" : ""}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-sm font-medium">
                {m.rotationPosition}
              </span>
              <span className="flex-1 font-medium">
                {m.name}
                {!m.active && (
                  <span className="ml-2 text-xs text-[var(--muted)]">(left)</span>
                )}
                {isRecipient && (
                  <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                    · up next
                  </span>
                )}
              </span>
              {m.payoutReceived ? (
                <span className="text-xs font-medium text-[var(--muted)]">
                  paid out
                </span>
              ) : m.contributedThisRound ? (
                <span className="rounded-full bg-[var(--ok-soft)] px-2.5 py-1 text-xs font-medium text-[var(--ok)]">
                  contributed
                </span>
              ) : m.active ? (
                <span className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                  pending
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );

  const viewingAs = (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-3">
      <p className="mb-2 text-xs font-medium text-[var(--muted)]">Viewing as</p>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <button
            key={m.userId}
            type="button"
            onClick={() => setActingUserId(m.userId)}
            className={`rounded-full px-3 py-1 text-sm ${
              m.userId === actingUserId
                ? "bg-[var(--ink)] text-[var(--paper)]"
                : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>
    </div>
  );

  const sideTabs = (
    <div className="flex gap-2" role="group" aria-label="Rules and chat">
      {(["rules", "chat"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setSideTab(t)}
          aria-pressed={sideTab === t}
          className={`rounded-full px-3 py-1.5 text-sm capitalize ${
            sideTab === t
              ? "bg-[var(--ink)] text-[var(--paper)]"
              : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );

  const sidePanel =
    sideTab === "rules" ? (
      <RulesPanel status={status} embedded />
    ) : (
      <ChatPanel groupId={group.id} userId={actingUserId} embedded />
    );

  const actionStack = (
    <div className="space-y-4">
      {payoutHero}
      {flash && (
        <div
          className="rounded-xl bg-[var(--ink)] p-3 text-center text-sm text-[var(--paper)]"
          role="status"
          aria-live="polite"
        >
          {flash}
        </div>
      )}
      {contributeButton}
      {group.cycleComplete && (
        <p className="rounded-xl bg-[var(--ok-soft)] p-3 text-center text-sm text-[var(--ok)]">
          Cycle complete. Under Polls, propose the next cycle. Everyone must
          approve.
        </p>
      )}
      <LivePollsPanel
        status={status}
        polls={polls}
        actingUserId={actingUserId}
        refresh={refresh}
        className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
      />
    </div>
  );

  const referenceStack = (
    <div className="space-y-4">
      {sideTabs}
      {sidePanel}
      {actingMember?.active && (
        <button
          type="button"
          onClick={onLeave}
          disabled={leaveBusy}
          className="w-full rounded-xl border border-[var(--warn)]/30 py-3 text-sm font-medium text-[var(--warn)] disabled:opacity-50"
        >
          {leaveBusy ? "Leaving…" : "Leave this susu"}
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile: stacked Command Center priority */}
      <div className="space-y-4 md:hidden">
        {header}
        {actionStack}
        {rotationList}
        {referenceStack}
        {viewingAs}
      </div>

      {/* Desktop: two-column Command Center */}
      <div className="hidden gap-6 md:grid md:grid-cols-[260px_1fr]">
        <aside className="space-y-4 md:sticky md:top-4 md:self-start">
          {header}
          {rotationList}
          {viewingAs}
        </aside>
        <div className="space-y-4">
          {actionStack}
          {referenceStack}
        </div>
      </div>
    </>
  );
}
