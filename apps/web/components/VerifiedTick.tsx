/**
 * Twitter-style inline checkmark. Render right after a verified user's display name.
 *
 *   <span className="font-bold">
 *     {user.display_name}
 *     <VerifiedTick verified={user.is_verified} />
 *   </span>
 */
export function VerifiedTick({
  verified,
  size = "sm",
  className = "",
}: {
  verified?: boolean | null;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  if (!verified) return null;

  const sz = size === "xs" ? "size-3"   :
             size === "md" ? "size-5"   :
                             "size-4";   // sm default

  return (
    <svg
      className={`inline-block align-baseline ml-1 -translate-y-px text-cyber ${sz} ${className}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label="Verified"
      role="img"
    >
      {/* Twitter-style sunburst frame + checkmark */}
      <path d="M22.5 12.5l-2.4 2.6.6 3.5-3.4.8-1.6 3.1-3.2-1.4-3.2 1.4-1.6-3.1-3.4-.8.6-3.5L1.5 12.5l2.4-2.6-.6-3.5 3.4-.8 1.6-3.1 3.2 1.4 3.2-1.4 1.6 3.1 3.4.8-.6 3.5 2.4 2.6z" />
      <path d="M10.5 16.5l-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4-6.5 6.5z" fill="var(--color-bg-base)" />
    </svg>
  );
}
