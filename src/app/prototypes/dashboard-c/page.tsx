"use client";

import { useState } from "react";
import {
  ProtoChatSnippet,
  ProtoChrome,
  ProtoContributeButton,
  ProtoPayoutHero,
  ProtoPollAlert,
  ProtoRotationList,
  ProtoRotationStrip,
  ProtoRulesSnippet,
  ProtoViewingAs,
} from "@/components/prototypes/ProtoChrome";
import { MOCK_GROUP_STATUS } from "@/lib/prototypes/mockStatus";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "rotation", label: "Rotation" },
  { id: "polls", label: "Polls" },
  { id: "rules", label: "Rules" },
  { id: "chat", label: "Chat" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DashboardCPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const { group } = MOCK_GROUP_STATUS;

  return (
    <ProtoChrome title="C · Tabbed Shell">
      <div className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold">
              {group.name}
            </p>
            <p className="text-xs text-[var(--muted)]">
              In progress · Cycle {group.currentCycle} · Round{" "}
              {group.currentRound}
            </p>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[12rem]">
            <ProtoContributeButton />
          </div>
        </div>
        <div
          className="mx-auto flex max-w-lg gap-1 overflow-x-auto px-4 pb-2"
          role="tablist"
          aria-label="Dashboard sections"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium ${
                tab === t.id
                  ? "bg-[var(--ink)] text-[var(--paper)]"
                  : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-6 pb-16">
        {tab === "overview" && (
          <>
            <ProtoPayoutHero />
            <ProtoPollAlert />
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Rotation
              </h2>
              <ProtoRotationStrip />
            </section>
          </>
        )}
        {tab === "rotation" && <ProtoRotationList />}
        {tab === "polls" && (
          <div className="space-y-3">
            <ProtoPollAlert />
            <p className="text-sm text-[var(--ink-soft)]">
              Closed votes and history would sit under the open poll.
            </p>
          </div>
        )}
        {tab === "rules" && <ProtoRulesSnippet />}
        {tab === "chat" && <ProtoChatSnippet />}

        <ProtoViewingAs />
      </main>
    </ProtoChrome>
  );
}
