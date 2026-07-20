"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Temporary home: entry point for the demo. The real create/join flow and
// multi-group list land in a later step (see docs/PLAN.md).
export default function DashboardPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dev/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Seed failed");
      router.push(`/group/${data.groupId}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-3xl font-bold">Susu</h1>
      <p className="mt-2 text-neutral-500">
        Save together. Take turns getting the pot.
      </p>

      <button
        onClick={loadDemo}
        disabled={busy}
        className="mt-8 w-full rounded-xl bg-neutral-900 py-3.5 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Setting up a demo group…" : "Load a live demo group"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <p className="mt-4 text-center text-xs text-neutral-400">
        Spins up “Sunday Savers” mid-round so you can see a payout fire.
      </p>
    </main>
  );
}
