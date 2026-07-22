"use client";

import { useMemo, useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import type { PollWithVotes } from "@/lib/db/polls";
import type { ChangeType } from "@/lib/db/types";
import { createPoll, votePoll } from "@/lib/api/client";
import { PhaseBadge } from "./PhaseBadge";

type TermKey =
  | "contribution_amount"
  | "schedule"
  | "rotation_order"
  | "round1_start_date";

const TERM_LABEL: Record<TermKey, string> = {
  contribution_amount: "Contribution amount",
  schedule: "How often you contribute",
  rotation_order: "Payout order",
  round1_start_date: "Round 1 start date",
};

function defaultStartDate(): string {
  // 7 days out, formatted for a <input type="date">.
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function SetupWizard({
  status,
  polls,
  actingUserId,
  refresh,
}: {
  status: GroupStatus;
  polls: PollWithVotes[];
  actingUserId: number | null;
  refresh: () => Promise<void>;
}) {
  const { group, members } = status;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proposal form state.
  const [amount, setAmount] = useState("50");
  const [schedule, setSchedule] = useState("weekly");
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [order, setOrder] = useState<number[]>(members.map((m) => m.userId));

  const approved = useMemo(
    () =>
      new Set(
        polls.filter((p) => p.status === "approved").map((p) => p.change_type),
      ),
    [polls],
  );
  const openByType = useMemo(() => {
    const map = new Map<string, PollWithVotes>();
    for (const p of polls) if (p.status === "open") map.set(p.change_type, p);
    return map;
  }, [polls]);

  const nameOf = (userId: number) =>
    members.find((m) => m.userId === userId)?.name ?? "A member";

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const propose = (changeType: ChangeType, changeDetails: unknown) =>
    act(() =>
      createPoll({
        groupId: group.id,
        proposedBy: actingUserId!,
        changeType,
        changeDetails,
      }),
    );

  const vote = (pollId: number, v: boolean) =>
    act(() => votePoll(pollId, actingUserId!, v));

  const enoughMembers = members.length >= 2;

  const proposedValue = (p: PollWithVotes): string => {
    const d = JSON.parse(p.change_details) as Record<string, unknown>;
    switch (p.change_type) {
      case "contribution_amount":
        return `$${d.amount}`;
      case "schedule":
        return String(d.schedule);
      case "round1_start_date":
        return new Date(String(d.startDate)).toLocaleDateString();
      case "rotation_order":
        return (d.orderedUserIds as number[]).map(nameOf).join(" → ");
      default:
        return "";
    }
  };

  return (
    <>
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <PhaseBadge phase={group.phase} />
        </div>
        <p className="mt-1 text-sm text-neutral-500">
          Agree on the terms together. Every member must approve each one.
        </p>
      </header>

      {/* Invite code + members */}
      <section className="mb-4 rounded-2xl border border-neutral-200 p-4">
        <p className="text-xs font-medium text-neutral-400">
          Share this code so others can join
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-widest">
          {group.inviteCode}
        </p>
        <p className="mt-3 text-xs font-medium text-neutral-400">
          Members ({members.length})
        </p>
        <p className="mt-1 text-sm">{members.map((m) => m.name).join(", ")}</p>
        {!enoughMembers && (
          <p className="mt-2 text-xs text-amber-600">
            Waiting for at least one more member before you start.
          </p>
        )}
      </section>

      <p className="mb-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
        💡 Most groups decide these on WhatsApp first, then just confirm here.
      </p>

      {/* One block per term */}
      <div className="space-y-3">
        {(Object.keys(TERM_LABEL) as TermKey[]).map((term) => {
          const isApproved = approved.has(term);
          const openPoll = openByType.get(term);
          return (
            <section
              key={term}
              className={`rounded-xl border p-4 ${
                isApproved ? "border-green-300 bg-green-50" : "border-neutral-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{TERM_LABEL[term]}</h3>
                {isApproved && (
                  <span className="text-xs font-medium text-green-700">
                    ✓ agreed
                  </span>
                )}
              </div>

              {/* Approved value */}
              {isApproved && (
                <p className="mt-1 text-sm text-neutral-600">
                  {term === "contribution_amount" && `$${group.contributionAmount}`}
                  {term === "schedule" && group.schedule}
                  {term === "round1_start_date" &&
                    group.round1StartAt &&
                    new Date(group.round1StartAt).toLocaleDateString()}
                  {term === "rotation_order" &&
                    members.map((m) => m.name).join(" → ")}
                </p>
              )}

              {/* Open proposal awaiting votes */}
              {!isApproved && openPoll && (
                <div className="mt-2">
                  <p className="text-sm">
                    Proposed:{" "}
                    <span className="font-medium">{proposedValue(openPoll)}</span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {openPoll.approvals} of {openPoll.votesNeeded} approved
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      disabled={busy}
                      onClick={() => vote(openPoll.id, true)}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => vote(openPoll.id, false)}
                      className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Propose control */}
              {!isApproved && !openPoll && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {term === "contribution_amount" && (
                    <>
                      <span className="text-sm">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-24 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        disabled={busy || !enoughMembers}
                        onClick={() =>
                          propose("contribution_amount", {
                            amount: Number(amount),
                          })
                        }
                        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Propose
                      </button>
                    </>
                  )}
                  {term === "schedule" && (
                    <>
                      <select
                        value={schedule}
                        onChange={(e) => setSchedule(e.target.value)}
                        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                      >
                        <option value="weekly">weekly</option>
                        <option value="biweekly">biweekly</option>
                        <option value="monthly">monthly</option>
                      </select>
                      <button
                        disabled={busy || !enoughMembers}
                        onClick={() => propose("schedule", { schedule })}
                        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Propose
                      </button>
                    </>
                  )}
                  {term === "round1_start_date" && (
                    <>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        disabled={busy || !enoughMembers}
                        onClick={() =>
                          propose("round1_start_date", {
                            startDate: new Date(startDate).toISOString(),
                          })
                        }
                        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      >
                        Propose
                      </button>
                    </>
                  )}
                  {term === "rotation_order" && (
                    <div className="w-full">
                      <p className="mb-2 text-sm text-neutral-600">
                        {order.map(nameOf).join(" → ")}
                      </p>
                      <div className="flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() =>
                            setOrder((o) => [...o].sort(() => Math.random() - 0.5))
                          }
                          className="rounded-lg bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 disabled:opacity-50"
                        >
                          🎲 Randomize
                        </button>
                        <button
                          disabled={busy || !enoughMembers}
                          onClick={() =>
                            propose("rotation_order", { orderedUserIds: order })
                          }
                          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          Propose this order
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <p className="mt-4 text-center text-xs text-neutral-400">
        Once all four are agreed, the group agreement is generated for signing.
      </p>
    </>
  );
}
