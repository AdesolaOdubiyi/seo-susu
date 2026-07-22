"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMemberships, saveMembership, type Membership } from "@/lib/api/session";
import { getErrorMessage } from "@/lib/ui/errors";

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
    <main className="mx-auto max-w-md px-6 py-10">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          Home
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-[var(--ink)]">
          Susu
        </h1>
        <p className="mt-2 text-[var(--ink-soft)]">
          Save together. Take turns getting the pot.
        </p>
      </header>

      {memberships.length > 0 && (
        <section className="mt-10">
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

      <section className="mt-10 space-y-3">
        <Link
          href="/create"
          className="btn-press block w-full rounded-2xl bg-[var(--accent)] py-3.5 text-center font-semibold text-white"
        >
          Start a susu
        </Link>
        <Link
          href="/join"
          className="btn-press block w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-3.5 text-center font-semibold text-[var(--ink)]"
        >
          Join with a code
        </Link>
      </section>

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-10 border-t border-[var(--line)] pt-4 text-center">
          {error && (
            <p className="mb-2 text-xs text-[var(--warn)]">{error}</p>
          )}
          <button
            onClick={loadDemo}
            disabled={busy}
            className="text-xs font-medium text-[var(--muted)] underline disabled:opacity-50"
          >
            {busy ? "Setting up…" : "Load a live demo group"}
          </button>
        </div>
      )}
    </main>
  );
}
