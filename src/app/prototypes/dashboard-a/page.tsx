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
  ProtoRotationStrip,
  ProtoRulesSnippet,
  ProtoViewingAs,
} from "@/components/prototypes/ProtoChrome";

const SECTIONS = [
  { id: "rotation", label: "Rotation detail" },
  { id: "polls", label: "Polls" },
  { id: "rules", label: "Rules" },
  { id: "chat", label: "Chat" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function DashboardAPage() {
  const [open, setOpen] = useState<SectionId | null>("polls");

  return (
    <ProtoChrome title="A · Status Strip">
      <main className="mx-auto max-w-md space-y-4 px-4 py-6 pb-16">
        <ProtoHeader />
        <ProtoPayoutHero />
        <ProtoContributeButton />
        <ProtoPollAlert />

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
            Rotation
          </h2>
          <ProtoRotationStrip />
        </section>

        <div className="space-y-2">
          {SECTIONS.map((s) => {
            const isOpen = open === s.id;
            return (
              <section
                key={s.id}
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]"
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : s.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold">{s.label}</span>
                  <span className="text-[var(--muted)]">{isOpen ? "▾" : "›"}</span>
                </button>
                {isOpen && (
                  <div className="border-t border-[var(--line)] p-4">
                    {s.id === "rotation" && <ProtoRotationList />}
                    {s.id === "polls" && (
                      <p className="text-sm text-[var(--ink-soft)]">
                        Open vote is shown above. Recent history would list
                        here.
                      </p>
                    )}
                    {s.id === "rules" && <ProtoRulesSnippet />}
                    {s.id === "chat" && <ProtoChatSnippet />}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <ProtoViewingAs />
      </main>
    </ProtoChrome>
  );
}
