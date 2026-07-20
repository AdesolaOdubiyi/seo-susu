"use client";

import { useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import { PhaseBadge } from "./PhaseBadge";

/** scheduled: everyone signed; waiting for the agreed Round 1 date. */
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
      </header>

      <section className="rounded-2xl bg-neutral-900 p-6 text-center text-white">
        <p className="text-sm text-neutral-400">Everyone signed 🎉</p>
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

      <div className="mt-6 rounded-xl border border-dashed border-neutral-300 p-3 text-center">
        <p className="mb-2 text-xs font-medium text-neutral-400">
          Dev · skip the wait
        </p>
        <button
          onClick={goLiveNow}
          disabled={busy}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 disabled:opacity-50"
        >
          {busy ? "Starting…" : "Start Round 1 now"}
        </button>
      </div>
    </>
  );
}
