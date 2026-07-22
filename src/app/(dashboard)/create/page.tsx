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
    <main className="mx-auto max-w-md p-6">
      <BackLink href="/" label="Home" />
      <h1 className="mt-4 text-2xl font-bold">Start a susu</h1>
      <p className="mt-1 text-sm text-neutral-500">
        You&apos;ll get a code to invite others. Everyone agrees on the terms
        together — no admin.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Group name</span>
          <input
            required
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Sunday Savers"
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input
            required
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Ama"
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-neutral-900 py-3.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create group"}
        </button>
      </form>
    </main>
  );
}
