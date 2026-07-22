import Link from "next/link";
import { HOME_PROTOTYPE_LINKS } from "@/lib/prototypes/homeFeatures";
import { PROTOTYPE_LINKS } from "@/lib/prototypes/mockStatus";

export default function PrototypesIndexPage() {
  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <Link
        href="/"
        className="text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)]"
      >
        ← Home
      </Link>
      <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Prototypes
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        Layout experiments. Production pages stay separate until you pick a
        winner.
      </p>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        Home features
      </h2>
      <ul className="mt-3 space-y-3">
        {HOME_PROTOTYPE_LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="panel-hover block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
            >
              <span className="font-semibold text-[var(--ink)]">{item.name}</span>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                {item.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        Dashboard
      </h2>
      <ul className="mt-3 space-y-3">
        {PROTOTYPE_LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="panel-hover block rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
            >
              <span className="font-semibold text-[var(--ink)]">{item.name}</span>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                {item.blurb}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
