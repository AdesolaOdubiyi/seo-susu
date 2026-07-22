"use client";

import { useEffect, useRef, useState } from "react";
import { sendChat } from "@/lib/api/client";

type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: Array<{ kind: string; label: string }>;
};

/** Grounded group assistant — asks /api/chat with live status context. */
export function ChatPanel({
  groupId,
  userId,
}: {
  groupId: number;
  userId: number | null;
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
      setError((err as Error).message);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "I couldn't answer that just now. Try again in a moment.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-neutral-200">
      <header className="border-b border-neutral-200 px-4 py-3">
        <h2 className="font-semibold">Ask Susu</h2>
        <p className="text-xs text-neutral-500">
          Questions about this group&apos;s status and rules
        </p>
      </header>

      <div className="max-h-72 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-400">
            Try: &quot;Who gets paid next?&quot; or &quot;Who hasn&apos;t
            contributed?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-8 bg-neutral-900 text-white"
                : "mr-8 bg-neutral-100 text-neutral-800"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.text}</p>
            {m.sources && m.sources.length > 0 && (
              <p className="mt-1 text-[10px] opacity-60">
                {m.sources.map((s) => s.label).join(" · ")}
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
            userId ? "Ask about this susu…" : "Pick who you’re acting as"
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
