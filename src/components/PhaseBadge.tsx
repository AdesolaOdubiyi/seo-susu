import { phaseLabel } from "@/lib/ui/labels";

export function PhaseBadge({ phase }: { phase: string }) {
  const live = phase === "live";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        live
          ? "bg-[var(--accent-soft)] text-[var(--accent-deep)]"
          : "bg-[var(--surface-2)] text-[var(--muted)]"
      }`}
    >
      {phaseLabel(phase)}
    </span>
  );
}
