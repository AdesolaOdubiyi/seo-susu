import Link from "next/link";
import type { ReactNode } from "react";

export function HomeProtoChrome({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="border-b border-[var(--line)] bg-[var(--surface)]/80 px-4 py-2 text-xs text-[var(--muted)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/prototypes" className="hover:text-[var(--ink)]">
            ← Prototypes
          </Link>
          <span className="font-medium text-[var(--ink-soft)]">{title}</span>
          <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[var(--accent)]">
            Home features
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function HomeProtoHeroStub() {
  return (
    <section className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
        Susu
      </h1>
      <p className="mt-2 text-[var(--ink-soft)]">
        Save together. Take turns getting the pot.
      </p>
      <div className="mt-6 flex max-w-sm flex-col gap-3 sm:flex-row">
        <span className="flex-1 rounded-2xl bg-[var(--accent)] py-3 text-center text-sm font-semibold text-white">
          Start a susu
        </span>
        <span className="flex-1 rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-3 text-center text-sm font-semibold">
          Join with a code
        </span>
      </div>
    </section>
  );
}
