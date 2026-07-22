import { HOME_FEATURES } from "@/lib/prototypes/homeFeatures";
import {
  HomeProtoChrome,
  HomeProtoHeroStub,
} from "@/components/prototypes/HomeProtoChrome";

/** C — split band: intro left, feature grid right. */
export default function HomeCPage() {
  return (
    <HomeProtoChrome title="C · Split Band">
      <HomeProtoHeroStub />
      <section className="border-t border-[var(--line)] bg-[var(--surface)]/60">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:gap-14">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
              What you can do
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Built for a trusted circle. Not a bank.
            </p>
            <p className="mt-8 text-xs leading-relaxed text-[var(--muted)]">
              This version is for practice and tracking. It does not hold,
              transfer, insure, or guarantee money.
            </p>
          </div>
          <ul className="grid gap-8 sm:grid-cols-2">
            {HOME_FEATURES.map((f) => (
              <li key={f.title} className="border-t border-[var(--line)] pt-4">
                <h3 className="font-semibold text-[var(--ink)]">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
                  {f.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </HomeProtoChrome>
  );
}
