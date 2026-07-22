"use client";

import { useEffect, useRef, useState } from "react";
import { sendChat } from "@/lib/api/client";
import { getErrorMessage } from "@/lib/ui/errors";

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Array<{ kind: string; label: string }>;
};

/** Group assistant grounded in live status and the signed agreement. */
export function ChatPanel({
  groupId,
  userId,
  embedded = false,
}: {
  groupId: number;
  userId: number | null;
  embedded?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !draft.trim() || busy) return;
    const text = draft.trim();
    setDraft("");
    setError(null);
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await sendChat({ groupId, userId, message: text });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: res.reply,
          sources: res.sources?.map((s) => ({
            kind: s.kind,
            label: s.label,
          })),
        },
      ]);
    } catch (err) {
      setError(getErrorMessage(err));
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I could not answer that. Try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className={
        embedded
          ? "rounded-2xl border border-[var(--line)] bg-[var(--surface)]"
          : "mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)]"
      }
    >      <header className="border-b border-[var(--line)] px-4 py-3">
        <h2 className="font-semibold text-[var(--ink)]">Ask Susu</h2>
        <p className="text-xs text-[var(--muted)]">
          Questions about this group&apos;s status and rules
        </p>
      </header>

      <div className="max-h-72 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--muted)]">
            Try: &quot;Who gets paid next?&quot; or &quot;Who hasn&apos;t
            contributed?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`rounded-2xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-8 bg-[var(--ink)] text-[var(--paper)]"
                : "mr-8 bg-[var(--surface-2)] text-[var(--ink-soft)]"
            }`}
          >
            <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
            {m.sources && m.sources.length > 0 && (
              <p className="mt-1 text-[10px] opacity-60">
                Based on {m.sources.map((s) => s.label).join(" · ")}
              </p>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="px-4 pb-2 text-xs text-red-600">{error}</p>
      )}

      <form
        onSubmit={onSend}
        className="flex gap-2 border-t border-neutral-200 p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            userId ? "Ask about this susu…" : "Choose who you are viewing as"
          }
          disabled={!userId || busy}
          className="flex-1 rounded-xl border border-neutral-300 px-3 py-2 text-sm disabled:bg-neutral-50"
        />
        <button
          type="submit"
          disabled={!userId || busy || !draft.trim()}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
