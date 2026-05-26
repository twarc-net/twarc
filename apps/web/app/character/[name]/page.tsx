import type { Metadata } from "next";
import { TagDetailView } from "@/components/TagDetailView";
import { fetchJsonInternal, SITE, trunc, humanizeName, breadcrumbJsonLd, SEO_KEYWORDS_BASE } from "@/lib/seo";

type RouteParams = { params: Promise<{ name: string }> };
type TagDetail = {
  tag: {
    name: string; category: string; description: string | null;
    cover_url: string | null; cover_hero: string | null;
    post_count: number; view_count: number;
  };
};

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { name } = await params;
  const r = await fetchJsonInternal<TagDetail>(`/api/characters/${encodeURIComponent(name)}`);
  const t = r?.tag;
  const human = humanizeName(name);

  if (!t) {
    return {
      title: `${human} — anime character wallpapers & PFPs`,
      description: `${human} hand-drawn anime character art on twarc — halal, free wallpapers & profile pictures.`,
    };
  }

  const title = `${human} — anime PFPs, wallpapers & fan art`;
  const description = trunc(
    t.description
      ? `${t.description} · ${t.post_count} ${human} pictures on twarc. Free anime PFPs, wallpapers, and fan art — halal, family-safe.`
      : `${t.post_count} hand-drawn ${human} pictures — anime PFPs, wallpapers, profile icons, and fan art. Halal-friendly, free to download on twarc.`
  );
  const canonical = `/character/${name}`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${human} anime`, `${human} pfp`, `${human} profile picture`, `${human} wallpaper`,
      `${human} icon`, `${human} fan art`, ...SEO_KEYWORDS_BASE,
    ],
    openGraph: {
      type: "profile",
      url: `${SITE}${canonical}`,
      title: `${title} · twarc`,
      description,
      ...(t.cover_hero || t.cover_url
        ? { images: [{ url: (t.cover_hero ?? t.cover_url)!, alt: `${human} anime character art on twarc` }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · twarc`,
      description,
      ...(t.cover_url ? { images: [t.cover_url] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function CharacterDetailPage({ params }: RouteParams) {
  const { name } = await params;
  const r = await fetchJsonInternal<TagDetail>(`/api/characters/${encodeURIComponent(name)}`).catch(() => null);
  const t = r?.tag;
  const human = humanizeName(name);

  const collectionJsonLd = t ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${human} — anime character wallpapers, PFPs & fan art on twarc`,
    description: t.description || `${t.post_count} ${human} anime pictures — free PFPs, wallpapers, icons.`,
    url: `${SITE}/character/${name}`,
    isFamilyFriendly: true,
    ...(t.cover_url ? { image: t.cover_url } : {}),
    about: { "@type": "Person", name: human, description: `Anime character — ${human}` },
  } : null;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home",       url: "/" },
    { name: "Characters", url: "/characters" },
    { name: human,        url: `/character/${name}` },
  ]);

  return (
    <>
      {collectionJsonLd && (
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      )}
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <TagDetailView kind="characters" name={name} />
    </>
  );
}
