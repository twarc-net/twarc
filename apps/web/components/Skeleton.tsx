export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Matches the PostTile layout exactly so the grid doesn't reflow on load. */
export function PostGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-border-subtle bg-bg-surface">
          <div className="skeleton aspect-[3/4]" />
          <div className="h-6 border-t border-border-subtle" />
        </div>
      ))}
    </div>
  );
}
