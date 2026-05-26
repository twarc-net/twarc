import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — twarc",
  description:
    "twarc is a human-curated, halal-friendly anime platform. Browse the full catalog with ratings + characters, build watchlists, write blog posts, share fan art. No NSFW, no AI.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="flex-1 mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight mb-3">
        About <span className="text-sakura">twarc</span>
      </h1>
      <p className="text-text-secondary text-sm font-mono uppercase tracking-[0.2em] mb-10">
        The World of Anime, Rated &amp; Curated
      </p>

      <div className="flex flex-col gap-6 text-text-secondary leading-relaxed">
        <p>
          twarc is a free, halal-friendly anime platform. It combines a comprehensive
          anime catalog with characters and ratings, a fan-art gallery curated by humans,
          personal watchlists, a long-form blog, and threaded comments — all on the same site,
          with the same content standards.
        </p>

        <h2 className="font-display font-bold text-2xl text-text-primary mt-4">
          What you can do here
        </h2>
        <ul className="list-disc list-inside space-y-1 text-text-secondary">
          <li><Link href="/anime" className="text-sakura hover:underline">Browse the anime catalog</Link> — thousands of series with synopsis, score, MAL rank, year, episodes, studios, genres, and the character roster.</li>
          <li><Link href="/characters" className="text-sakura hover:underline">Find a character</Link> — portrait, the anime they appear in, and any fan art uploaded by the community.</li>
          <li><strong className="text-text-primary">Add anime to your list</strong> — Watching / Plan to Watch / Completed / On Hold / Dropped, plus a separate favorites bucket.</li>
          <li><strong className="text-text-primary">Watch where it&apos;s streaming</strong> — popular series link out to Crunchyroll, Netflix, HIDIVE, Funimation, and others (subject to your region).</li>
          <li><strong className="text-text-primary">Upload hand-drawn fan art</strong> — mods review every submission before it goes public.</li>
          <li><Link href="/blog" className="text-sakura hover:underline">Read or write the blog</Link> — long-form essays with a real editor (images, formatting, code, links).</li>
          <li><strong className="text-text-primary">Comment + reply</strong> — threaded discussions on posts and blog articles, with @-mentions and real-time notifications.</li>
          <li><strong className="text-text-primary">Earn achievements</strong> — Steam-style milestones that appear on your profile.</li>
        </ul>

        <h2 className="font-display font-bold text-2xl text-text-primary mt-4">
          What we are
        </h2>
        <ul className="list-disc list-inside space-y-1 text-text-secondary">
          <li><strong className="text-text-primary">Family-safe.</strong> Strictly SFW. No nudity, no suggestive content.</li>
          <li><strong className="text-text-primary">Halal-friendly.</strong> No alcohol / smoking / gambling imagery; no Hentai / Ecchi / Harem / BL / GL / R+ / Rx-rated anime in the catalog.</li>
          <li><strong className="text-text-primary">Human-curated.</strong> Every uploaded image and every blog post is reviewed before publishing.</li>
          <li><strong className="text-text-primary">Hand-drawn only.</strong> AI-generated artwork is not permitted.</li>
          <li><strong className="text-text-primary">Free.</strong> No paywall, no ads, no tracking pixels.</li>
        </ul>

        <h2 className="font-display font-bold text-2xl text-text-primary mt-4">
          What we aren&apos;t
        </h2>
        <ul className="list-disc list-inside space-y-1 text-text-secondary">
          <li>We are not the rights holder for any anime — copyright remains with each studio.</li>
          <li>We are not the rights holder for fan art — copyright remains with each artist.</li>
          <li>We do not host explicit, suggestive, or AI-generated content.</li>
          <li>We do not sell user data; see <Link href="/privacy" className="text-sakura hover:underline">privacy</Link>.</li>
        </ul>

        <h2 className="font-display font-bold text-2xl text-text-primary mt-4">
          Where the data comes from
        </h2>
        <p>
          Anime metadata (titles, scores, episode counts, character rosters, streaming availability)
          is sourced from <a href="https://myanimelist.net" target="_blank" rel="noopener noreferrer" className="text-sakura hover:underline">MyAnimeList</a> via the
          <a href="https://docs.api.jikan.moe" target="_blank" rel="noopener noreferrer" className="text-sakura hover:underline"> Jikan API</a>. Every entry passes through a halal filter before being added.
          Catalog refreshes nightly so newly-aired series appear automatically.
        </p>

        <h2 className="font-display font-bold text-2xl text-text-primary mt-4">
          Contribute
        </h2>
        <p>
          Anyone with an account can submit fan art or write blog posts.
          Moderators usually approve within a day. See <Link href="/terms" className="text-sakura hover:underline">our terms</Link> for content rules.
        </p>

        <h2 className="font-display font-bold text-2xl text-text-primary mt-4">
          Contact
        </h2>
        <p>
          Reach us at <a href="mailto:hello@twarc.net" className="text-sakura hover:underline">hello@twarc.net</a> for
          takedown requests, partnerships, or questions.
        </p>
      </div>
    </main>
  );
}
