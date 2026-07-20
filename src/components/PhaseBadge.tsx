const PHASE_LABEL: Record<string, string> = {
  setup: "Setting up",
  awaiting_signatures: "Awaiting signatures",
  scheduled: "Starting soon",
  live: "Live",
  cycle_complete: "Cycle complete",
};

export function PhaseBadge({ phase }: { phase: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        phase === "live"
          ? "bg-green-100 text-green-800"
          : "bg-neutral-100 text-neutral-600"
      }`}
    >
      {PHASE_LABEL[phase] ?? phase}
    </span>
  );
}
