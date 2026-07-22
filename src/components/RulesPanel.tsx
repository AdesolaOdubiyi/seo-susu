"use client";

import { useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import { getAgreement } from "@/lib/api/client";

/** Current rules & signed agreement for this group. */
export function RulesPanel({ status }: { status: GroupStatus }) {
  const { group, activeAgreement, members } = status;
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<
    Array<{ id: number; version: number; status: string; generated_at: string }>
  >([]);
  const [loadedHistory, setLoadedHistory] = useState(false);

  const loadHistory = async () => {
    if (loadedHistory) return;
    try {
      const res = await getAgreement(group.id);
      setHistory(
        res.history.map((h) => ({
          id: h.id,
          version: h.version,
          status: h.status,
          generated_at: h.generated_at,
        })),
      );
      setLoadedHistory(true);
    } catch {
      setLoadedHistory(true);
    }
  };

  const order = members
    .filter((m) => m.active)
    .slice()
    .sort((a, b) => a.rotationPosition - b.rotationPosition);

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void loadHistory();
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <h2 className="font-semibold">Rules & agreement</h2>
          <p className="text-xs text-neutral-500">
            {activeAgreement
              ? `v${activeAgreement.version} · ${activeAgreement.status}`
              : "No signed agreement yet"}
          </p>
        </div>
        <span className="text-neutral-400">{open ? "▾" : "›"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-neutral-200 p-4">
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-neutral-400">Amount</dt>
              <dd className="font-medium">${group.contributionAmount}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-400">Cadence</dt>
              <dd className="font-medium">{group.schedule || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-400">Invite code</dt>
              <dd className="font-mono font-medium tracking-wider">
                {group.inviteCode}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-400">Phase</dt>
              <dd className="font-medium">{group.phase}</dd>
            </div>
          </dl>

          <div>
            <p className="text-xs font-medium text-neutral-400">Payout order</p>
            <p className="mt-1 text-sm">
              {order.map((m) => m.name).join(" → ") || "—"}
            </p>
          </div>

          {activeAgreement?.renderedText && (
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-neutral-50 p-3 font-sans text-xs text-neutral-700">
              {activeAgreement.renderedText}
            </pre>
          )}

          {history.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium text-neutral-400">
                Version history
              </p>
              <ul className="space-y-1 text-xs text-neutral-600">
                {history.map((h) => (
                  <li key={h.id}>
                    v{h.version} · {h.status} ·{" "}
                    {new Date(h.generated_at).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
