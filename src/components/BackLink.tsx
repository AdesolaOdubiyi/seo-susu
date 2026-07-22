import Link from "next/link";

/** Plain text back control — use on every non-home screen. */
export function BackLink({
  href = "/",
  label = "Back",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
    >
      <span aria-hidden="true">←</span>
      {label}
    </Link>
  );
}
