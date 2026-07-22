import { HOME_FEATURES } from "@/lib/prototypes/homeFeatures";
import {
  HomeProtoChrome,
  HomeProtoHeroStub,
} from "@/components/prototypes/HomeProtoChrome";

/** A — equal multi-column feature grid (no cards). */
export default function HomeAPage() {
  return (
    <HomeProtoChrome title="A · Feature Grid">
      <HomeProtoHeroStub />
      <section className="border-t border-[var(--line)] bg-[var(--surface)]/60">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            What you can do
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Built for a trusted circle. Not a bank.
          </p>
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {HOME_FEATURES.map((f) => (
              <li key={f.title}>
                <h3 className="font-semibold text-[var(--ink)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-12 text-xs leading-relaxed text-[var(--muted)]">
            This version is for practice and tracking. It does not hold,
            transfer, insure, or guarantee money.
          </p>
        </div>
      </section>
    </HomeProtoChrome>
  );
}
