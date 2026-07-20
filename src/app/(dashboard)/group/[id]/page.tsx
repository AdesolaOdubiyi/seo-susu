"use client";

import { use, useCallback, useEffect, useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import { contribute, getStatus } from "@/lib/api/client";

const PHASE_LABEL: Record<string, string> = {
  setup: "Setting up",
  awaiting_signatures: "Awaiting signatures",
  scheduled: "Starting soon",
  live: "Live",
  cycle_complete: "Cycle complete",
};

export default function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);

  const [status, setStatus] = useState<GroupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingUserId, setActingUserId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await getStatus(groupId);
      setStatus(next);
      setError(null);
      setActingUserId((prev) => prev ?? next.members[0]?.userId ?? null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [groupId]);

  // Poll for live updates so payouts/round advances appear without a reload.
  // setState happens only after the awaited fetch resolves, never synchronously.
  useEffect(() => {
    let active = true;
    const tick = () => {
      if (active) void refresh();
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [refresh]);

  const onContribute = async () => {
    if (!actingUserId) return;
    setBusy(true);
    try {
      const result = await contribute(groupId, actingUserId);
      if (result.payout) {
        setFlash(
          `💸 ${result.payout.recipient.name} received $${result.payout.amount}` +
            (result.payout.cycleComplete ? " — cycle complete!" : " — next round!"),
        );
      } else if (result.waitingOnPoll) {
        setFlash("Round is fully funded, but an open poll is pausing the payout.");
      }
      await refresh();
    } catch (e) {
      setFlash((e as Error).message);
    } finally {
      setBusy(false);
      setTimeout(() => setFlash(null), 4000);
    }
  };

  if (error) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>
      </main>
    );
  }
  if (!status) {
    return (
      <main className="mx-auto max-w-md p-6 text-center text-neutral-500">
        Loading…
      </main>
    );
  }

  const { group, members, currentRecipient, round } = status;
  const actingMember = members.find((m) => m.userId === actingUserId);
  const canContribute =
    group.phase === "live" &&
    actingMember?.active &&
    !actingMember?.contributedThisRound;

  return (
    <main className="mx-auto max-w-md p-4 pb-24">
      {/* Header */}
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              group.phase === "live"
                ? "bg-green-100 text-green-800"
                : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {PHASE_LABEL[group.phase] ?? group.phase}
          </span>
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Cycle {group.currentCycle} · Round {group.currentRound} · $
          {group.contributionAmount}/{group.schedule}
        </p>
      </header>

      {/* Recipient + pot */}
      <section className="mb-4 rounded-2xl bg-neutral-900 p-5 text-white">
        <p className="text-sm text-neutral-400">This round&apos;s payout</p>
        {currentRecipient ? (
          <>
            <p className="mt-1 text-2xl font-bold">{currentRecipient.name}</p>
            <p className="mt-1 text-lg">receives ${round.potAmount}</p>
          </>
        ) : (
          <p className="mt-1 text-2xl font-bold">Cycle complete 🎉</p>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-neutral-400">
            {round.contributed} of {round.expected} paid this round
          </span>
          <span
            className={round.stalled ? "text-amber-400" : "text-neutral-300"}
          >
            {round.stalled
              ? "Stalled — payment overdue"
              : `Due in ${round.daysUntilDeadline} day(s)`}
          </span>
        </div>
        {round.payoutBlocked && (
          <p className="mt-2 rounded-lg bg-amber-500/20 p-2 text-xs text-amber-200">
            Payout paused: {round.payoutBlockedReason}
          </p>
        )}
      </section>

      {/* Rotation + contribution status */}
      <section className="mb-4">
        <h2 className="mb-2 text-sm font-semibold text-neutral-500">
          Rotation order
        </h2>
        <ul className="space-y-2">
          {members.map((m) => {
            const isRecipient = currentRecipient?.userId === m.userId;
            return (
              <li
                key={m.userId}
                className={`flex items-center gap-3 rounded-xl border p-3 ${
                  isRecipient
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200"
                } ${!m.active ? "opacity-50" : ""}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium">
                  {m.rotationPosition}
                </span>
                <span className="flex-1 font-medium">
                  {m.name}
                  {!m.active && (
                    <span className="ml-2 text-xs text-neutral-400">(left)</span>
                  )}
                  {isRecipient && (
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                      · up next
                    </span>
                  )}
                </span>
                {m.payoutReceived ? (
                  <span className="text-xs font-medium text-neutral-400">
                    ✓ paid out
                  </span>
                ) : m.contributedThisRound ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                    contributed
                  </span>
                ) : m.active ? (
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
                    pending
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {flash && (
        <div className="mb-3 rounded-xl bg-neutral-900 p-3 text-center text-sm text-white">
          {flash}
        </div>
      )}

      {/* Contribute action */}
      <button
        onClick={onContribute}
        disabled={!canContribute || busy}
        className="w-full rounded-xl bg-green-600 py-3.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
      >
        {actingMember?.contributedThisRound
          ? "You've contributed this round"
          : busy
            ? "Sending…"
            : `Mark my $${group.contributionAmount} as sent`}
      </button>

      {/* Dev-only: act as any member to walk the round end-to-end */}
      <div className="mt-6 rounded-xl border border-dashed border-neutral-300 p-3">
        <p className="mb-2 text-xs font-medium text-neutral-400">
          Dev · acting as
        </p>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.userId}
              onClick={() => setActingUserId(m.userId)}
              className={`rounded-full px-3 py-1 text-sm ${
                m.userId === actingUserId
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
