"use client";

import { useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import { PhaseBadge } from "./PhaseBadge";

/** Waiting room after everyone signed, before Round 1. */
export function ScheduledScreen({
  status,
  refresh,
}: {
  status: GroupStatus;
  refresh: () => Promise<void>;
}) {
  const { group } = status;
  const [busy, setBusy] = useState(false);

  const goLiveNow = async () => {
    setBusy(true);
    try {
      await fetch("/api/dev/go-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: group.id }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <PhaseBadge phase={group.phase} />
        </div>
        <p className="mt-1 text-xs text-neutral-400">
          Invite code{" "}
          <span className="font-mono tracking-wider text-neutral-600">
            {group.inviteCode}
          </span>
        </p>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-6 text-center text-white">
        <p className="text-sm text-neutral-400">Everyone signed</p>
        <p className="mt-2 text-lg">Round 1 starts on</p>
        <p className="mt-1 text-2xl font-bold">
          {group.round1StartAt
            ? new Date(group.round1StartAt).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })
            : "the agreed date"}
        </p>
      </section>

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] p-3 text-center">
          <p className="mb-2 text-xs font-medium text-[var(--muted)]">
            For demos
          </p>
          <button
            onClick={goLiveNow}
            disabled={busy}
            className="btn-press rounded-xl bg-[var(--surface-2)] px-4 py-2 text-sm font-medium text-[var(--ink)] disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start Round 1 now"}
          </button>
        </div>
      )}
    </>
  );
}
