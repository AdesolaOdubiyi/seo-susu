import Link from "next/link";
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
        Dashboard prototypes
      </h1>
      <p className="mt-2 text-sm text-[var(--ink-soft)]">
        Three layout ideas for the live group screen. Same mock Sunday Savers
        mid-round data in each. Production group pages are unchanged.
      </p>

      <ul className="mt-8 space-y-3">
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
