import type { Metadata } from "next";
import { PostDetailClient } from "@/components/PostDetailClient";
import { CommentSection } from "@/components/CommentSection";
import { fetchJsonInternal, SITE, trunc, humanizeTags, breadcrumbJsonLd, SEO_KEYWORDS_BASE } from "@/lib/seo";
import type { PostFull } from "@/lib/api";

type RouteParams = { params: Promise<{ id: string }> };

/** Pick the right copy modifier based on aspect ratio: wallpaper, PFP, or art. */
function intentLabel(w: number, h: number): string {
  if (!w || !h) return "anime art";
  const ratio = w / h;
  if (Math.abs(ratio - 1) < 0.12) return "anime PFP / icon";
  if (ratio > 1.4) return "anime wallpaper";
  if (ratio < 0.7) return "anime mobile wallpaper / lock screen";
  return "anime art";
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { id } = await params;
  const r = await fetchJsonInternal<{ post: PostFull }>(`/api/posts/${id}`);
  const p = r?.post;

  if (!p) {
    return { title: "Post not found", robots: { index: false } };
  }

  const tagsHuman = humanizeTags(p.tag_string, 8);
  const intent = intentLabel(p.width, p.height);
  const baseTitle = p.title || (tagsHuman ? tagsHuman.split(",").slice(0, 3).join(",").trim() : `Anime art #${p.id}`);
  // Bake the intent (wallpaper/pfp) into the SEO title — that's what people search for.
  const title = `${baseTitle} — ${intent} (${p.width}×${p.height})`;
  const description = trunc(
    p.description
      ? `${p.description} · halal anime art, ${p.width}×${p.height}. Free to download.`
      : tagsHuman
        ? `${tagsHuman} — ${intent}, ${p.width}×${p.height}. Hand-drawn, halal-friendly anime art on twarc. Free download.`
        : `Hand-drawn ${intent} on twarc — halal, family-safe, ${p.width}×${p.height}. Free download.`
  );
  const canonical = `/post/${p.id}`;
  const tagKeywords = tagsHuman.split(",").map((s) => s.trim()).filter(Boolean);

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [...tagKeywords, ...SEO_KEYWORDS_BASE],
    openGraph: {
      type: "article",
      url: `${SITE}${canonical}`,
      title: `${title} · twarc`,
      description,
      images: [{ url: p.sample_url || p.preview_url, width: p.width, height: p.height, alt: `${baseTitle} — ${intent} on twarc` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · twarc`,
      description,
      images: [p.sample_url || p.preview_url],
    },
    robots: { index: true, follow: true },
  };
}

export default async function PostDetailPage({ params }: RouteParams) {
  const { id } = await params;
  const idNum = Number(id);

  const r = await fetchJsonInternal<{ post: PostFull }>(`/api/posts/${id}`).catch(() => null);
  const initialPost = r?.post ?? null;

  const imageJsonLd = initialPost ? {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "@id": `${SITE}/post/${initialPost.id}#image`,
    contentUrl: initialPost.original_url,
    url: `${SITE}/post/${initialPost.id}`,
    thumbnailUrl: initialPost.thumb_url,
    name: initialPost.title || humanizeTags(initialPost.tag_string, 5) || `Anime art #${initialPost.id} on twarc`,
    description: initialPost.description || `Hand-drawn anime art on twarc — halal-friendly, ${initialPost.width}×${initialPost.height}. Free to download and use as wallpaper or PFP.`,
    caption: humanizeTags(initialPost.tag_string, 10),
    width: initialPost.width,
    height: initialPost.height,
    uploadDate: initialPost.created_at,
    contentSize: initialPost.file_size,
    encodingFormat: initialPost.ext === "jpg" ? "image/jpeg" : `image/${initialPost.ext}`,
    isFamilyFriendly: true,
    representativeOfPage: true,
    creator: initialPost.uploader ? {
      "@type": "Person",
      name: initialPost.uploader.display_name ?? initialPost.uploader.username,
      url: `${SITE}/u/${initialPost.uploader.username}`,
    } : undefined,
    creditText: "twarc.net",
    copyrightNotice: "All artwork © respective artists. twarc is a gallery, not the rights holder.",
    license: `${SITE}/licensing`,
    acquireLicensePage: `${SITE}/licensing`,
    keywords: initialPost.tag_string,
  } : null;

  const breadcrumbs = initialPost ? breadcrumbJsonLd([
    { name: "Home",   url: "/" },
    { name: "Browse", url: "/browse" },
    { name: `Post #${initialPost.id}`, url: `/post/${initialPost.id}` },
  ]) : null;

  return (
    <>
      {imageJsonLd && (
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(imageJsonLd) }} />
      )}
      {breadcrumbs && (
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      )}
      <PostDetailClient id={idNum} initialPost={initialPost} />
      <div className="mx-auto w-full max-w-7xl px-4 pb-12">
        <CommentSection postId={idNum} />
      </div>
    </>
  );
}
