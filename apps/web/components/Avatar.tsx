/**
 * Reusable user avatar. Renders the uploaded image if avatar_thumb is set,
 * otherwise falls back to a deterministic colored circle with the first letter.
 *
 * Used wherever a user appears: nav, profile, post detail uploader card,
 * mod queue, search results, comments.
 */
export function Avatar({
  user,
  size = "md",
  className = "",
}: {
  user: {
    username: string;
    display_name?: string | null;
    avatar_thumb?: string | null;
    avatar_url?: string | null;
  };
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizeClass = {
    xs: "size-5 text-[10px]",
    sm: "size-7 text-xs",
    md: "size-9 text-sm",
    lg: "size-16 text-2xl",
    xl: "size-24 text-4xl",
  }[size];

  const src = size === "xl" || size === "lg" ? (user.avatar_url ?? user.avatar_thumb) : (user.avatar_thumb ?? user.avatar_url);
  const letter = (user.display_name ?? user.username).charAt(0).toUpperCase();

  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={src}
        alt={user.username}
        className={`${sizeClass} rounded-full object-cover border border-border-strong ${className}`}
        loading="lazy"
      />
    );
  }

  // Fallback: deterministic colored letter circle from username hash
  let h = 0;
  for (let i = 0; i < user.username.length; i++) h = (h * 31 + user.username.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return (
    <span
      className={`${sizeClass} rounded-full grid place-items-center font-display font-black text-bg-base shrink-0 ${className}`}
      style={{ background: `hsl(${hue} 60% 70%)` }}
      aria-label={user.username}
    >
      {letter}
    </span>
  );
}
