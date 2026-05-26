import type { Metadata } from "next";
import Link from "next/link";
import { fetchJsonInternal, SITE, breadcrumbJsonLd } from "@/lib/seo";
import type { BlogPostCard } from "@/lib/api";

export const metadata: Metadata = {
  title: "Blog — twarc",
  description:
    "twarc blog: artist features, anime spotlights, halal art commentary, platform updates.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    url: `${SITE}/blog`,
    title: "Blog — twarc",
    description: "twarc blog: artist features, anime spotlights, halal art commentary, platform updates.",
  },
};

type ListResp = { data: BlogPostCard[]; meta: { page: number; last_page: number; total: number } };

export default async function BlogIndex() {
  const r = await fetchJsonInternal<ListResp>("/api/blog?per_page=24");
  const items = r?.data ?? [];

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Blog", url: "/blog" },
  ]);

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <main className="flex-1 mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight">
            <span className="text-sakura">blog</span>
          </h1>
          <p className="text-text-secondary mt-2 text-sm sm:text-base max-w-2xl">
            Artist features, anime spotlights, and platform updates. Written by humans, reviewed by humans.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="border border-dashed border-border-strong p-10 text-center text-text-muted">
            No posts yet — be the first to <Link href="/dashboard/blog/new" className="text-sakura hover:underline">publish one →</Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p, i) => (
              <li key={p.id}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="group block border border-border-subtle bg-bg-surface hover:border-sakura transition-colors h-full flex flex-col fade-in"
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                >
                  {p.cover_url ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.cover_url} alt={p.title} loading="lazy"
                        className="size-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-gradient-to-br from-bg-elevated to-bg-surface grid place-items-center">
                      <span className="font-display font-black text-6xl text-sakura/15 select-none">{p.title.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h2 className="font-display font-bold text-lg leading-tight tracking-tight group-hover:text-sakura transition-colors">
                      {p.title}
                    </h2>
                    <p className="text-sm text-text-secondary line-clamp-3 flex-1">{p.excerpt}</p>
                    <div className="text-xs font-mono text-text-muted flex items-center gap-2 mt-1">
                      {p.author && <span>@{p.author.username}</span>}
                      <span>·</span>
                      <time>{p.published_at ? new Date(p.published_at).toLocaleDateString() : ""}</time>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
