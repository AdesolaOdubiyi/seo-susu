"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/BackLink";
import { createGroup } from "@/lib/api/client";
import { saveMembership } from "@/lib/api/session";

export default function CreateGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { group, creator, inviteCode } = await createGroup({
        name: groupName.trim(),
        creatorName: creatorName.trim(),
      });
      saveMembership({
        groupId: group.id,
        userId: creator.id,
        name: creator.name,
        groupName: group.name,
      });
      // inviteCode is also shown on the setup screen; nothing else to do here.
      void inviteCode;
      router.push(`/group/${group.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <BackLink href="/" label="Home" />
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Start a susu
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        You&apos;ll get a code to invite others. Everyone agrees on the terms
        together — no special admin powers.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Group name
          </span>
          <input
            required
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Sunday Savers"
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Your name
          </span>
          <input
            required
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Ama"
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
          />
        </label>

        {error && <p className="text-sm text-[var(--warn)]">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-press w-full rounded-2xl bg-[var(--accent)] py-3.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create group"}
        </button>
      </form>
    </main>
  );
}
