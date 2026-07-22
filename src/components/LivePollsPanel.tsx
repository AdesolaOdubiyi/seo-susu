"use client";

import { useMemo, useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import type { PollWithVotes } from "@/lib/db/polls";
import type { ChangeType } from "@/lib/db/types";
import { createPoll, votePoll } from "@/lib/api/client";
import {
  memberDisplayName,
  pollStatusLabel,
  pollTypeLabel,
} from "@/lib/ui/labels";

/** Live-phase polls: amount, schedule, add/remove member, start next cycle. */
export function LivePollsPanel({
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
  const [panel, setPanel] = useState<ChangeType | null>(null);

  const [amount, setAmount] = useState(String(group.contributionAmount || 50));
  const [schedule, setSchedule] = useState(group.schedule || "weekly");
  const [newMemberName, setNewMemberName] = useState("");
  const [removeTarget, setRemoveTarget] = useState<number | "">("");
  const [removeAmount, setRemoveAmount] = useState(
    String(group.contributionAmount || 50),
  );
  const [removeDate, setRemoveDate] = useState(() =>
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );

  const openPolls = useMemo(
    () => polls.filter((p) => p.status === "open"),
    [polls],
  );
  const recentClosed = useMemo(
    () => polls.filter((p) => p.status !== "open").slice(0, 5),
    [polls],
  );

  const nameOf = (id: number) =>
    memberDisplayName(members.find((m) => m.userId === id)?.name);

  const act = async (fn: () => Promise<unknown>) => {
    if (!actingUserId) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
      setPanel(null);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const propose = (changeType: ChangeType, changeDetails: unknown = {}) =>
    act(() =>
      createPoll({
        groupId: group.id,
        proposedBy: actingUserId!,
        changeType,
        changeDetails,
      }),
    );

  const summarize = (p: PollWithVotes): string => {
    try {
      const d = JSON.parse(p.change_details) as Record<string, unknown>;
      switch (p.change_type) {
        case "contribution_amount":
          return `Contribution amount → $${d.amount}`;
        case "schedule":
          return `How often → ${d.schedule}`;
        case "add_member":
          return `Add ${d.userName}`;
        case "remove_member":
          return `Remove ${nameOf(Number(d.targetUserId))} · new amount $${d.newAmount}`;
        case "start_cycle":
          return "Start the next cycle";
        case "rotation_order":
          return "Payout order";
        case "round1_start_date":
          return "Round 1 start date";
        default:
          return pollTypeLabel(p.change_type);
      }
    } catch {
      return pollTypeLabel(p.change_type);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200 p-4">
      <h2 className="font-semibold">Polls</h2>
      <p className="mt-0.5 text-xs text-neutral-500">
        Changes need unanimous approval. Open polls pause payouts.
      </p>

      {openPolls.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {openPolls.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-amber-200 bg-amber-50 p-3"
            >
              <p className="text-sm font-medium">{summarize(p)}</p>
              <p className="mt-1 text-xs text-neutral-500">
                by {p.proposed_by_name} · {p.approvals}/{p.votesNeeded}{" "}
                approved · due{" "}
                {new Date(p.deadline).toLocaleDateString()}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  disabled={busy || !actingUserId}
                  onClick={() => act(() => votePoll(p.id, actingUserId!, true))}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  disabled={busy || !actingUserId}
                  onClick={() =>
                    act(() => votePoll(p.id, actingUserId!, false))
                  }
                  className="rounded-lg bg-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-400">No open polls</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ["contribution_amount", "Change amount"],
            ["schedule", "Change how often"],
            ["add_member", "Add member"],
            ["remove_member", "Remove member"],
          ] as const
        ).map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => setPanel(panel === type ? null : type)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              panel === type
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {label}
          </button>
        ))}
        {group.cycleComplete && (
          <button
            type="button"
            disabled={busy || !actingUserId}
            onClick={() => propose("start_cycle", {})}
            className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800 disabled:opacity-50"
          >
            Propose next cycle
          </button>
        )}
      </div>

      {panel === "contribution_amount" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-24 rounded-lg border px-2 py-1.5 text-sm"
          />
          <button
            disabled={busy}
            onClick={() =>
              propose("contribution_amount", { amount: Number(amount) })
            }
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Propose
          </button>
        </div>
      )}

      {panel === "schedule" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-sm"
          >
            <option value="weekly">weekly</option>
            <option value="biweekly">biweekly</option>
            <option value="monthly">monthly</option>
          </select>
          <button
            disabled={busy}
            onClick={() => propose("schedule", { schedule })}
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Propose
          </button>
        </div>
      )}

      {panel === "add_member" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            placeholder="Name"
            className="rounded-lg border px-2 py-1.5 text-sm"
          />
          <button
            disabled={busy || !newMemberName.trim()}
            onClick={() =>
              propose("add_member", { userName: newMemberName.trim() })
            }
            className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            Propose
          </button>
        </div>
      )}

      {panel === "remove_member" && (
        <div className="mt-3 space-y-2">
          <select
            value={removeTarget}
            onChange={(e) =>
              setRemoveTarget(e.target.value ? Number(e.target.value) : "")
            }
            className="w-full rounded-lg border px-2 py-1.5 text-sm"
          >
            <option value="">Who to remove…</option>
            {members
              .filter((m) => m.active && m.userId !== actingUserId)
              .map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name}
                </option>
              ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">New $</span>
            <input
              type="number"
              value={removeAmount}
              onChange={(e) => setRemoveAmount(e.target.value)}
              className="w-20 rounded-lg border px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={removeDate}
              onChange={(e) => setRemoveDate(e.target.value)}
              className="rounded-lg border px-2 py-1.5 text-sm"
            />
            <button
              disabled={busy || removeTarget === ""}
              onClick={() =>
                propose("remove_member", {
                  targetUserId: removeTarget,
                  newAmount: Number(removeAmount),
                  newPayoutDate: new Date(removeDate).toISOString(),
                })
              }
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Propose
            </button>
          </div>
        </div>
      )}

      {recentClosed.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-3">
          <p className="text-xs font-medium text-neutral-400">Recent</p>
          <ul className="mt-1 space-y-1 text-xs text-neutral-500">
            {recentClosed.map((p) => (
              <li key={p.id}>
                {summarize(p)} · {pollStatusLabel(p.status)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
