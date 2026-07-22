"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/BackLink";
import { joinGroup } from "@/lib/api/client";
import { saveMembership } from "@/lib/api/session";

export default function JoinGroupPage() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [userName, setUserName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { group, user } = await joinGroup({
        inviteCode: inviteCode.trim(),
        userName: userName.trim(),
      });
      saveMembership({
        groupId: group.id,
        userId: user.id,
        name: user.name,
        groupName: group.name,
      });
      router.push(`/group/${group.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <BackLink href="/" label="Home" />
      <h1 className="mt-4 text-2xl font-bold">Join a susu</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Enter the code a group member shared with you.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Invite code</span>
          <input
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5 font-mono tracking-widest uppercase"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input
            required
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Kofi"
            className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2.5"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-neutral-900 py-3.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join group"}
        </button>
      </form>
    </main>
  );
}
