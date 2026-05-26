import Link from "next/link";

/**
 * Section header for the homepage and similar landing rows.
 *
 * Renders a left-aligned title with a "Browse all → " link on the right
 * that's tall enough to be a comfortable tap target on mobile.
 */
export function SectionHeader({
  title, accent, href, label,
}: {
  title: string;
  accent?: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4 sm:mb-6 px-1">
      <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
        {accent && <span className="text-sakura">{accent} </span>}
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-strong text-sm font-mono text-text-secondary hover:text-bg-base hover:bg-sakura hover:border-sakura transition-colors min-h-9"
        >
          {label ?? "see all"}
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      )}
    </div>
  );
}
