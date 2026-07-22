import { HOME_FEATURES } from "@/lib/prototypes/homeFeatures";
import {
  HomeProtoChrome,
  HomeProtoHeroStub,
} from "@/components/prototypes/HomeProtoChrome";

/** B — horizontal snap rail of feature panels. */
export default function HomeBPage() {
  return (
    <HomeProtoChrome title="B · Scroll Rail">
      <HomeProtoHeroStub />
      <section className="border-t border-[var(--line)] bg-[var(--surface)]/60 py-14">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
            What you can do
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Built for a trusted circle. Not a bank.
          </p>
          <ul className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pr-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {HOME_FEATURES.map((f) => (
              <li
                key={f.title}
                className="w-[min(280px,78vw)] shrink-0 snap-start rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
              >
                <h3 className="font-semibold text-[var(--ink)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-10 text-xs leading-relaxed text-[var(--muted)]">
            This version is for practice and tracking. It does not hold,
            transfer, insure, or guarantee money.
          </p>
        </div>
      </section>
    </HomeProtoChrome>
  );
}
