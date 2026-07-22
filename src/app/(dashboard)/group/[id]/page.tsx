"use client";

import { use, useCallback, useEffect, useState } from "react";
import type { GroupStatus } from "@/lib/db/contributions";
import type { PollWithVotes } from "@/lib/db/polls";
import { getStatus, listPolls } from "@/lib/api/client";
import { getMembership } from "@/lib/api/session";
import { getErrorMessage } from "@/lib/ui/errors";
import { BackLink } from "@/components/BackLink";
import { ChatPanel } from "@/components/ChatPanel";
import { LiveDashboard } from "@/components/LiveDashboard";
import { RulesPanel } from "@/components/RulesPanel";
import { SetupWizard } from "@/components/SetupWizard";
import { SignScreen } from "@/components/SignScreen";
import { ScheduledScreen } from "@/components/ScheduledScreen";

export default function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = Number(id);

  const [status, setStatus] = useState<GroupStatus | null>(null);
  const [polls, setPolls] = useState<PollWithVotes[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actingUserId, setActingUserId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextStatus, pollsRes] = await Promise.all([
        getStatus(groupId),
        listPolls(groupId).catch(() => ({ polls: [] as PollWithVotes[] })),
      ]);
      setStatus(nextStatus);
      setPolls(pollsRes.polls);
      setError(null);
      setActingUserId(
        (prev) =>
          prev ??
          getMembership(groupId)?.userId ??
          nextStatus.members[0]?.userId ??
          null,
      );
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [groupId]);

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (active) void refresh();
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [refresh]);

  if (error) {
    return (
      <main className="mx-auto max-w-md p-6">
        <BackLink href="/" label="All groups" />
        <p className="mt-4 rounded-lg bg-[var(--warn-soft)] p-4 text-[var(--warn)]">
          {error}
        </p>
      </main>
    );
  }
  if (!status) {
    return (
      <main className="mx-auto max-w-md p-6">
        <BackLink href="/" label="All groups" />
        <p className="mt-8 text-center text-[var(--muted)]">Loading…</p>
      </main>
    );
  }

  const isLive =
    status.group.phase === "live" || status.group.phase === "cycle_complete";

  return (
    <main
      className={`mx-auto p-4 pb-24 ${isLive ? "max-w-5xl" : "max-w-md"}`}
    >
      <div className="mb-3">
        <BackLink href="/" label="All groups" />
      </div>
      {status.group.phase === "setup" && (
        <SetupWizard
          status={status}
          polls={polls}
          actingUserId={actingUserId}
          refresh={refresh}
        />
      )}
      {status.group.phase === "awaiting_signatures" && (
        <SignScreen
          status={status}
          actingUserId={actingUserId}
          refresh={refresh}
        />
      )}
      {status.group.phase === "scheduled" && (
        <ScheduledScreen status={status} refresh={refresh} />
      )}
      {isLive && (
        <LiveDashboard
          status={status}
          polls={polls}
          actingUserId={actingUserId}
          setActingUserId={setActingUserId}
          refresh={refresh}
        />
      )}

      {!isLive && (
        <>
          <RulesPanel status={status} />
          <ChatPanel groupId={groupId} userId={actingUserId} />
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface)] p-3">
            <p className="mb-2 text-xs font-medium text-[var(--muted)]">
              Viewing as
            </p>
            <div className="flex flex-wrap gap-2">
              {status.members.map((m) => (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => setActingUserId(m.userId)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    m.userId === actingUserId
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
