import type { Metadata } from "next";
import { TagDetailView } from "@/components/TagDetailView";
import { fetchJsonInternal, SITE, trunc, humanizeName, breadcrumbJsonLd, SEO_KEYWORDS_BASE } from "@/lib/seo";

type RouteParams = { params: Promise<{ name: string }> };
type TagDetail = {
  tag: {
    name: string; category: string; description: string | null;
    cover_url: string | null; cover_hero: string | null;
    post_count: number;
  };
};

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { name } = await params;
  const r = await fetchJsonInternal<TagDetail>(`/api/anime/${encodeURIComponent(name)}`);
  const t = r?.tag;
  const human = humanizeName(name);

  if (!t) return {
    title: `${human} — anime art, wallpapers & PFPs`,
    description: `${human} hand-drawn anime art on twarc.`,
  };

  const title = `${human} — anime wallpapers, PFPs & art`;
  const description = trunc(
    t.description
      ? `${t.description} · ${t.post_count} halal-friendly ${human} anime posts on twarc. Free wallpapers, PFPs, fan art.`
      : `${t.post_count} hand-drawn ${human} anime posts — free wallpapers, PFPs, and fan art on twarc. Halal, family-safe, no AI slop.`
  );
  const canonical = `/anime/${name}`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      `${human} anime`, `${human} wallpaper`, `${human} pfp`, `${human} fan art`,
      `${human} icon`, ...SEO_KEYWORDS_BASE,
    ],
    openGraph: {
      type: "profile",
      url: `${SITE}${canonical}`,
      title: `${title} · twarc`,
      description,
      ...(t.cover_hero || t.cover_url
        ? { images: [{ url: (t.cover_hero ?? t.cover_url)!, alt: `${human} anime cover on twarc` }] }
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

export default async function AnimeDetailPage({ params }: RouteParams) {
  const { name } = await params;
  const r = await fetchJsonInternal<TagDetail>(`/api/anime/${encodeURIComponent(name)}`).catch(() => null);
  const t = r?.tag;
  const human = humanizeName(name);

  const collectionJsonLd = t ? {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${human} — anime wallpapers, PFPs & art on twarc`,
    description: t.description || `${t.post_count} ${human} anime posts.`,
    url: `${SITE}/anime/${name}`,
    isFamilyFriendly: true,
    ...(t.cover_url ? { image: t.cover_url } : {}),
    about: { "@type": "CreativeWork", name: human },
  } : null;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home",  url: "/" },
    { name: "Anime", url: "/anime" },
    { name: human,   url: `/anime/${name}` },
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
      <TagDetailView kind="anime" name={name} />
    </>
  );
}
