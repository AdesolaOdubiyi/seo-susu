"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMemberships, type Membership } from "@/lib/api/session";

export default function HomePage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // localStorage is client-only, so we hydrate memberships after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMemberships(getMemberships());
  }, []);

  const loadDemo = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok) router.push(`/group/${data.groupId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Home
        </p>
        <h1 className="mt-1 text-3xl font-bold">Susu</h1>
        <p className="mt-1 text-neutral-500">
          Save together. Take turns getting the pot.
        </p>
      </header>

      {memberships.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-neutral-500">
            Your groups
          </h2>
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.groupId}>
                <Link
                  href={`/group/${m.groupId}`}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
                >
                  <span>
                    <span className="font-semibold">{m.groupName}</span>
                    <span className="block text-xs text-neutral-500">
                      you are {m.name}
                    </span>
                  </span>
                  <span className="text-neutral-300">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 space-y-3">
        <Link
          href="/create"
          className="block w-full rounded-xl bg-neutral-900 py-3.5 text-center font-semibold text-white"
        >
          Start a susu
        </Link>
        <Link
          href="/join"
          className="block w-full rounded-xl border border-neutral-300 py-3.5 text-center font-semibold"
        >
          Join with a code
        </Link>
      </section>

      <div className="mt-8 border-t border-neutral-200 pt-4 text-center">
        <button
          onClick={loadDemo}
          disabled={busy}
          className="text-xs font-medium text-neutral-400 underline disabled:opacity-50"
        >
          {busy ? "Setting up…" : "Dev · load a live demo group"}
        </button>
      </div>
    </main>
  );
}
