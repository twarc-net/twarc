import type { BadgeChip as BadgeT } from "@/lib/api";

const COLOR_CLASS: Record<string, string> = {
  sakura:  "border-sakura text-sakura bg-sakura/10",
  cyber:   "border-cyber text-cyber bg-cyber/10",
  peach:   "border-peach text-peach bg-peach/10",
  matcha:  "border-matcha text-matcha bg-matcha/10",
};

export function BadgeChip({ badge, size = "sm" }: { badge: BadgeT; size?: "xs" | "sm" }) {
  const cls = COLOR_CLASS[badge.color] ?? "border-border-strong text-text-secondary bg-bg-elevated";
  const sizing = size === "xs" ? "px-1.5 py-0.5 text-[10px] gap-1" : "px-2 py-0.5 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center ${sizing} border font-mono uppercase tracking-wider ${cls}`}
      title={badge.description ?? badge.name}
    >
      <span aria-hidden>{badge.icon}</span>
      <span>{badge.name}</span>
    </span>
  );
}

export function BadgeRow({ badges, size }: { badges: BadgeT[]; size?: "xs" | "sm" }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => <BadgeChip key={b.slug} badge={b} size={size} />)}
    </div>
  );
}
