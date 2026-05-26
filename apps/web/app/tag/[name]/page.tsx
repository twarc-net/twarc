import type { Metadata } from "next";
import { TagDetailView } from "@/components/TagDetailView";
import { fetchJsonInternal, SITE, humanizeName } from "@/lib/seo";

type RouteParams = { params: Promise<{ name: string }> };
type TagDetail = {
  tag: { name: string; description: string | null; cover_url: string | null; post_count: number };
};

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { name } = await params;
  const r = await fetchJsonInternal<TagDetail>(`/api/tag/${encodeURIComponent(name)}`);
  const t = r?.tag;
  const human = humanizeName(name);
  const description = t
    ? (t.description || `${t.post_count} posts tagged "${human}" on twarc.`)
    : `Posts tagged "${human}" on twarc.`;

  return {
    title: `${human} · tag`,
    description,
    alternates: { canonical: `/tag/${name}` },
    keywords: [human, "anime", "tag"],
    openGraph: {
      url: `${SITE}/tag/${name}`,
      title: `${human} · tag — twarc`,
      description,
      ...(t?.cover_url ? { images: [{ url: t.cover_url, alt: human }] } : {}),
    },
  };
}

export default async function TagDetailPage({ params }: RouteParams) {
  const { name } = await params;
  return <TagDetailView kind="tag" name={name} />;
}
