import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownBody } from "@/components/MarkdownBody";
import { fetchJsonInternal, SITE, trunc, breadcrumbJsonLd } from "@/lib/seo";
import type { BlogPostFull } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import { VerifiedTick } from "@/components/VerifiedTick";
import { CommentSection } from "@/components/CommentSection";

type RouteParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const r = await fetchJsonInternal<{ post: BlogPostFull }>(`/api/blog/${encodeURIComponent(slug)}`);
  const p = r?.post;
  if (!p) return { title: "Post not found", robots: { index: false } };

  const description = trunc(p.excerpt || p.body.replace(/[#>*_`]+/g, " ").replace(/\s+/g, " "));

  return {
    title: p.title,
    description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      type: "article",
      url: `${SITE}/blog/${p.slug}`,
      title: p.title,
      description,
      images: p.cover_url ? [{ url: p.cover_url, alt: p.title }] : undefined,
      authors: [p.author.display_name ?? p.author.username],
      publishedTime: p.published_at ?? undefined,
    },
    twitter: {
      card: p.cover_url ? "summary_large_image" : "summary",
      title: p.title,
      description,
      images: p.cover_url ? [p.cover_url] : undefined,
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogDetailPage({ params }: RouteParams) {
  const { slug } = await params;
  const r = await fetchJsonInternal<{ post: BlogPostFull }>(`/api/blog/${encodeURIComponent(slug)}`);
  const p = r?.post;
  if (!p) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.excerpt || trunc(p.body.replace(/[#>*_`]+/g, " ")),
    image: p.cover_url ? [p.cover_url] : undefined,
    datePublished: p.published_at,
    dateModified: p.updated_at,
    author: {
      "@type": "Person",
      name: p.author.display_name ?? p.author.username,
      url: `${SITE}/u/${p.author.username}`,
    },
    publisher: { "@id": `${SITE}/#org` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE}/blog/${p.slug}` },
    inLanguage: "en",
    isFamilyFriendly: true,
  };

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
    { name: p.title, url: `/blog/${p.slug}` },
  ]);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />

      <main className="flex-1 mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <article>
          <header className="mb-7 sm:mb-10">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-text-muted mb-3">
              <Link href="/blog" className="hover:text-sakura">← blog</Link>
            </div>
            <h1 className="font-display font-black text-3xl sm:text-5xl leading-tight tracking-tight mb-4 text-text-primary">
              {p.title}
            </h1>
            <div className="flex items-center gap-3 text-sm">
              <Link href={`/u/${p.author.username}`} className="flex items-center gap-2 hover:text-sakura transition-colors">
                <Avatar user={p.author} size="sm" />
                <span className="text-text-primary font-medium">
                  {p.author.display_name ?? p.author.username}
                  <VerifiedTick verified={p.author.is_verified} />
                </span>
              </Link>
              <span className="text-text-muted">·</span>
              <time className="text-text-muted text-xs font-mono">
                {p.published_at ? new Date(p.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : ""}
              </time>
              <span className="text-text-muted text-xs font-mono">· {p.view_count} reads</span>
            </div>

            {p.cover_url && (
              <div className="mt-6 -mx-4 sm:mx-0 border-y sm:border border-border-subtle bg-bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.cover_url} alt={p.title} className="w-full h-auto" loading="eager" />
              </div>
            )}
          </header>

          <MarkdownBody source={p.body} />

          <footer className="mt-12 pt-6 border-t border-border-subtle">
            <Link href="/blog" className="text-sm text-sakura hover:underline">← back to blog</Link>
          </footer>
        </article>

        <CommentSection blogSlug={p.slug} />
      </main>
    </>
  );
}
