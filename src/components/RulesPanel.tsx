"use client";

import { useEffect, useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import { getAgreement } from "@/lib/api/client";
import { agreementStatusLabel, phaseLabel } from "@/lib/ui/labels";

/** Current rules & signed agreement for this group. */
export function RulesPanel({
  status,
  embedded = false,
}: {
  status: GroupStatus;
  /** When true, show content open (Command Center tab) without a collapse header. */
  embedded?: boolean;
}) {
  const { group, activeAgreement, members } = status;
  const [open, setOpen] = useState(embedded);
  const [history, setHistory] = useState<
    Array<{ id: number; version: number; status: string; generated_at: string }>
  >([]);
  const [loadedHistory, setLoadedHistory] = useState(false);

  useEffect(() => {
    if (!embedded) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await getAgreement(group.id);
        if (cancelled) return;
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
        if (!cancelled) setLoadedHistory(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [embedded, group.id]);

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

  const body = (
    <div
      className={`space-y-3 ${embedded ? "p-4" : "border-t border-[var(--line)] p-4"}`}
    >
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-[var(--muted)]">Amount</dt>
          <dd className="font-medium tabular-nums">
            ${group.contributionAmount}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">How often</dt>
          <dd className="font-medium">
            {group.schedule === "biweekly"
              ? "Every 2 weeks"
              : group.schedule || "Not set yet"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Invite code</dt>
          <dd className="font-mono font-medium tracking-wider">
            {group.inviteCode}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--muted)]">Stage</dt>
          <dd className="font-medium">{phaseLabel(group.phase)}</dd>
        </div>
      </dl>

      <div>
        <p className="text-xs font-medium text-[var(--muted)]">Payout order</p>
        <p className="mt-1 text-sm">
          {order.map((m) => m.name).join(" → ") || "Not set yet"}
        </p>
      </div>

      {activeAgreement?.renderedText && (
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-[var(--surface-2)] p-3 font-sans text-xs text-[var(--ink-soft)]">
          {activeAgreement.renderedText}
        </pre>
      )}

      {history.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-[var(--muted)]">
            Earlier versions
          </p>
          <ul className="space-y-1 text-xs text-[var(--ink-soft)]">
            {history.map((h) => (
              <li key={h.id}>
                Version {h.version} · {agreementStatusLabel(h.status)} ·{" "}
                {new Date(h.generated_at).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return (
      <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <h2 className="font-semibold text-[var(--ink)]">Rules & agreement</h2>
          <p className="text-xs text-[var(--muted)]">
            {activeAgreement
              ? `Version ${activeAgreement.version} · ${agreementStatusLabel(activeAgreement.status)}`
              : "No signed agreement yet"}
          </p>
        </div>
        {body}
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void loadHistory();
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <h2 className="font-semibold text-[var(--ink)]">Rules & agreement</h2>
          <p className="text-xs text-[var(--muted)]">
            {activeAgreement
              ? `Version ${activeAgreement.version} · ${agreementStatusLabel(activeAgreement.status)}`
              : "No signed agreement yet"}
          </p>
        </div>
        <span className="text-[var(--muted)]">{open ? "▾" : "›"}</span>
      </button>

      {open && body}
    </section>
  );
}
