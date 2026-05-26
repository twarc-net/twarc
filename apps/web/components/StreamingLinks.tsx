"use client";

/**
 * Render "Watch on …" buttons for streaming platforms a series is on.
 *
 * Data comes from Jikan's /anime/{id}/streaming endpoint, stored on
 * anime_meta.streaming_links as JSONB.
 *
 * Each known platform gets a brand color; unknown ones get the neutral
 * border treatment. We deep-link to the platform's series page — users still
 * need a regional subscription to actually watch.
 */
const BRAND_COLOR: Record<string, string> = {
  Crunchyroll:  "#F47521",
  Netflix:      "#E50914",
  Funimation:   "#5A0DC9",
  HIDIVE:       "#00B0F0",
  Hulu:         "#1CE783",
  "Amazon Prime Video": "#00A8E1",
  "Disney+":    "#0063E5",
  Bilibili:     "#00A1D6",
  YouTube:      "#FF0000",
  AnimeLab:     "#8E1AAD",
  Wakanim:      "#FF6633",
  VRV:          "#FFCC00",
  Viki:         "#1FB1E1",
  Tubi:         "#FF7B00",
  RetroCrush:   "#FFC400",
  Anime:        "#FF6B35",
  YouTube_:     "#FF0000",
};

function brand(name: string): string {
  for (const k of Object.keys(BRAND_COLOR)) {
    if (name.toLowerCase().includes(k.toLowerCase())) return BRAND_COLOR[k];
  }
  return "#7BA9F7"; // neutral blue fallback
}

export function StreamingLinks({ links }: { links: Array<{ name: string; url: string }> }) {
  if (!links || links.length === 0) return null;
  return (
    <div className="mt-3 sm:mt-4">
      <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] text-text-muted mb-1.5 sm:mb-2">
        Watch on
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {links.map((l) => {
          const c = brand(l.name);
          return (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-display font-bold border-2 transition-colors hover:bg-bg-surface active:bg-bg-surface"
              style={{ color: c, borderColor: c }}
              title={`Open ${l.name}`}
            >
              <span className="size-2" style={{ background: c }} aria-hidden />
              {l.name}
              <span aria-hidden className="opacity-60">↗</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
