"use client";

import { useState } from "react";
import {
  ProtoChatSnippet,
  ProtoChrome,
  ProtoContributeButton,
  ProtoHeader,
  ProtoPayoutHero,
  ProtoPollAlert,
  ProtoRotationList,
  ProtoRulesSnippet,
  ProtoViewingAs,
} from "@/components/prototypes/ProtoChrome";

type SideTab = "rules" | "chat";

export default function DashboardBPage() {
  const [sideTab, setSideTab] = useState<SideTab>("rules");

  return (
    <ProtoChrome title="B · Command Center">
      <main className="mx-auto max-w-5xl px-4 py-6 pb-16">
        {/* Mobile: stacked priority order */}
        <div className="space-y-4 md:hidden">
          <ProtoHeader />
          <ProtoPayoutHero />
          <ProtoContributeButton />
          <ProtoPollAlert />
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Rotation
            </h2>
            <ProtoRotationList />
          </section>
          <div className="flex gap-2">
            {(["rules", "chat"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setSideTab(t)}
                className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                  sideTab === t
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {sideTab === "rules" ? <ProtoRulesSnippet /> : <ProtoChatSnippet />}
          <ProtoViewingAs />
        </div>

        {/* Desktop: two columns */}
        <div className="hidden gap-6 md:grid md:grid-cols-[240px_1fr]">
          <aside className="space-y-4 md:sticky md:top-16 md:self-start">
            <ProtoHeader />
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                Rotation
              </h2>
              <ProtoRotationList />
            </section>
            <ProtoViewingAs />
          </aside>

          <div className="space-y-4">
            <ProtoPayoutHero />
            <ProtoContributeButton />
            <ProtoPollAlert />

            <div className="flex gap-2" role="group" aria-label="Side panels">
              {(["rules", "chat"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSideTab(t)}
                  aria-pressed={sideTab === t}
                  className={`rounded-full px-3 py-1.5 text-sm capitalize ${
                    sideTab === t
                      ? "bg-[var(--ink)] text-[var(--paper)]"
                      : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            {sideTab === "rules" ? <ProtoRulesSnippet /> : <ProtoChatSnippet />}
          </div>
        </div>
      </main>
    </ProtoChrome>
  );
}
