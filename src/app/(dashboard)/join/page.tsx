"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/BackLink";
import { joinGroup } from "@/lib/api/client";
import { saveMembership } from "@/lib/api/session";
import { getErrorMessage } from "@/lib/ui/errors";

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
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <BackLink href="/" label="Home" />
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Join a susu
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        Enter the code a group member shared with you.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Invite code
          </span>
          <input
            required
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 font-mono tracking-widest uppercase"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Your name
          </span>
          <input
            required
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Kofi"
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
          />
        </label>

        {error && <p className="text-sm text-[var(--warn)]">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="btn-press w-full rounded-2xl bg-[var(--accent)] py-3.5 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join group"}
        </button>
      </form>
    </main>
  );
}
