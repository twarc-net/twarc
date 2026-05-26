import Image from "next/image";

/**
 * Site wordmark. Served from cdn.twarc.net at its native 2048×1054 resolution
 * and downscaled by next/image with automatic retina (2×, 3×) variants for
 * sharp rendering at any screen density.
 *
 * Defaults to a 44 px tall presentation; pass `heightPx` to override.
 */
export function Logo({
  heightPx = 44,
  priority = true,
  className = "",
}: {
  heightPx?: number;
  priority?: boolean;
  className?: string;
}) {
  const NATIVE_W = 2048;
  const NATIVE_H = 1054;
  const widthPx = Math.round((NATIVE_W / NATIVE_H) * heightPx);

  return (
    <Image
      src="https://cdn.twarc.net/twarc.png"
      alt="twarc — The World of Anime, Rated & Curated"
      width={widthPx}
      height={heightPx}
      priority={priority}
      quality={95}
      className={`w-auto select-none ${className}`}
      style={{ height: `${heightPx}px` }}
      sizes={`${widthPx * 2}px`}
    />
  );
}
