"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMemberships, saveMembership, type Membership } from "@/lib/api/session";
import { getErrorMessage } from "@/lib/ui/errors";
import { HOME_FEATURES } from "@/lib/prototypes/homeFeatures";

type SeedMember = { userId: number; name: string };

function isSeedMember(value: unknown): value is SeedMember {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.userId === "number" && typeof row.name === "string";
}

export default function HomePage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // localStorage is client-only; hydrate after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemberships(getMemberships());
  }, []);

  const loadDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Could not load the demo group.";
        setError(getErrorMessage(message));
        return;
      }
      if (
        typeof data !== "object" ||
        data === null ||
        typeof (data as { groupId?: unknown }).groupId !== "number" ||
        !Array.isArray((data as { members?: unknown }).members)
      ) {
        setError("Could not load the demo group.");
        return;
      }
      const groupId = (data as { groupId: number }).groupId;
      const first = (data as { members: unknown[] }).members.find(isSeedMember);
      if (first) {
        saveMembership({
          groupId,
          userId: first.userId,
          name: first.name,
          groupName: "Sunday Savers",
        });
      }
      router.push(`/group/${groupId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <section className="mx-auto flex min-h-[min(100vh,640px)] max-w-2xl flex-col justify-center px-6 py-14">
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl">
          Susu
        </h1>
        <p className="mt-3 text-lg text-[var(--ink-soft)] sm:text-xl">
          Save together. Take turns getting the pot.
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
          Pool regular contributions with people you trust. Everyone receives
          the full pot once, in turn.
        </p>

        <div
          className="mt-8 max-w-sm rounded-2xl bg-[var(--ink)] p-5 text-[var(--paper)]"
          aria-hidden="true"
        >
          <p className="text-sm text-white/55">This round&apos;s payout</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
            Your turn
          </p>
          <p className="mt-1 text-sm text-white/65">
            3 of 5 paid · due in 2 days
          </p>
        </div>

        <div className="mt-8 flex max-w-sm flex-col gap-3 sm:flex-row">
          <Link
            href="/create"
            className="btn-press flex-1 rounded-2xl bg-[var(--accent)] py-3.5 text-center font-semibold text-white"
          >
            Start a susu
          </Link>
          <Link
            href="/join"
            className="btn-press flex-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-3.5 text-center font-semibold text-[var(--ink)]"
          >
            Join with a code
          </Link>
        </div>

        {process.env.NODE_ENV !== "production" && (
          <div className="mt-4 max-w-sm">
            {error && (
              <p className="mb-2 text-xs text-[var(--warn)]">{error}</p>
            )}
            <button
              type="button"
              onClick={loadDemo}
              disabled={busy}
              className="text-xs font-medium text-[var(--muted)] underline disabled:opacity-50"
            >
              {busy ? "Setting up…" : "Load a live demo group"}
            </button>
          </div>
        )}
      </section>

      {memberships.length > 0 && (
        <section className="mx-auto max-w-2xl px-6 pb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Your groups
          </h2>
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.groupId}>
                <Link
                  href={`/group/${m.groupId}`}
                  className="panel-hover flex items-center justify-between rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                >
                  <span>
                    <span className="font-semibold text-[var(--ink)]">
                      {m.groupName}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      you are {m.name}
                    </span>
                  </span>
                  <span className="text-[var(--muted)]">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-t border-[var(--line)] bg-[var(--surface)]/60 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            What you can do
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Built for a trusted circle. Not a bank.
          </p>
          <ul className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HOME_FEATURES.map((f) => (
              <li
                key={f.title}
                className="w-[min(280px,78vw)] shrink-0 snap-start rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
              >
                <h3 className="font-semibold text-[var(--ink)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs leading-relaxed text-[var(--muted)]">
            This version is for practice and tracking. It does not hold,
            transfer, insure, or guarantee money.
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="mt-6">
              <Link
                href="/prototypes"
                className="text-xs font-medium text-[var(--accent)] underline"
              >
                Layout prototypes
              </Link>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
