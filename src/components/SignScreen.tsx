"use client";

import { useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import { signAgreement } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/ui/errors";
import { PhaseBadge } from "./PhaseBadge";

/** Collect signatures while the group waits on the agreement. */
export function SignScreen({
  status,
  actingUserId,
  refresh,
}: {
  status: GroupStatus;
  actingUserId: number | null;
  refresh: () => Promise<void>;
}) {
  const { group, members, activeAgreement } = status;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signed = new Set(activeAgreement?.signedBy ?? []);
  const actingSigned = actingUserId != null && signed.has(actingUserId);

  const onSign = async () => {
    if (!actingUserId) return;
    setBusy(true);
    setError(null);
    try {
      await signAgreement(group.id, actingUserId);
      await refresh();
    } catch (e) {
      setError(getErrorMessage(e));
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
        <p className="mt-1 text-sm text-neutral-500">
          Everyone signs the agreement to lock in the terms.
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Invite code{" "}
          <span className="font-mono tracking-wider text-neutral-600">
            {group.inviteCode}
          </span>
        </p>
      </header>

      {activeAgreement ? (
        <>
          <section className="mb-4 max-h-80 overflow-y-auto rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700">
              {activeAgreement.renderedText}
            </pre>
          </section>

          <section className="mb-4">
            <h2 className="mb-2 text-sm font-semibold text-neutral-500">
              Signatures ({signed.size} of {members.filter((m) => m.active).length})
            </h2>
            <ul className="space-y-2">
              {members
                .filter((m) => m.active)
                .map((m) => (
                  <li
                    key={m.userId}
                    className="flex items-center justify-between rounded-xl border border-neutral-200 p-3"
                  >
                    <span className="font-medium">{m.name}</span>
                    {signed.has(m.userId) ? (
                      <span className="text-xs font-medium text-green-700">
                        ✓ signed
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">
                        awaiting signature
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </section>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={onSign}
            disabled={busy || actingSigned}
            className="w-full rounded-xl bg-neutral-900 py-3.5 font-semibold text-white transition disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            {actingSigned
              ? "You signed"
              : busy
                ? "Signing…"
                : "I agree. Sign"}
          </button>
        </>
      ) : (
        <p className="text-neutral-500">Preparing the agreement…</p>
      )}
    </>
  );
}
