import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — twarc",
  description:
    "twarc terms: account rules, content policy for posts and blog, intellectual property, third-party metadata sources, streaming links, and termination conditions.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "2026-05-26";

export default function TermsPage() {
  return (
    <main className="flex-1 mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight mb-3">
        Terms of <span className="text-sakura">Service</span>
      </h1>
      <p className="text-text-muted text-xs font-mono uppercase tracking-[0.2em] mb-10">
        Last updated: {UPDATED}
      </p>

      <div className="flex flex-col gap-7 text-text-secondary leading-relaxed">
        <Section title="1. Acceptance">
          <p>By using twarc.net (&ldquo;twarc,&rdquo; &ldquo;the service&rdquo;) you agree to these terms. If you don&apos;t agree, please don&apos;t use the service.</p>
        </Section>

        <Section title="2. Eligibility">
          <p>You must be at least 13 years old to use twarc. Between 13 and the age of majority in your jurisdiction, you must have a parent or guardian&apos;s consent.</p>
        </Section>

        <Section title="3. Accounts">
          <ul className="list-disc list-inside space-y-1">
            <li>You are responsible for your account credentials.</li>
            <li>One person per account; multi-accounting to evade moderation is grounds for ban.</li>
            <li>We may suspend or terminate accounts that violate these terms.</li>
            <li>Your profile, badges, achievements, follows, and watchlist are public by default. Your private notes on watchlist entries are visible only to you.</li>
          </ul>
        </Section>

        <Section title="4. Content rules">
          <p>twarc is a halal-friendly, family-safe platform. The following applies to <strong className="text-text-primary">all user content</strong> — uploaded images, blog posts, blog cover images, comments, replies, and watchlist notes:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>No nudity, semi-nudity, or sexually suggestive content (includes — but is not limited to — swimwear, lingerie, cleavage, suggestive poses, fan-service framing).</li>
            <li>No AI-generated images of any kind.</li>
            <li>No alcohol, drug, gambling, or smoking imagery.</li>
            <li>No gore, graphic violence, or shock content.</li>
            <li>No harassment, hate speech, doxxing, or threats.</li>
            <li>No content that infringes copyright unless you are the rights holder or have explicit permission.</li>
            <li>No spam, scams, malware links, or affiliate-link manipulation.</li>
          </ul>
          <p className="mt-2">Every uploaded image and every blog post is reviewed before going public. We reserve the right to remove content for any reason consistent with these terms.</p>
        </Section>

        <Section title="5. Blog posts and inline images">
          <p>Blog authors can embed images directly via the editor. By uploading an image to twarc — whether through the post uploader or the blog editor — you confirm you have the right to host and display it, and you grant twarc the license described in section 6.</p>
          <p className="mt-2">Image uploads are content-addressed and deduplicated. We may remove any uploaded image at any time for violating these terms.</p>
        </Section>

        <Section title="6. Intellectual property">
          <p>You retain ownership of artwork and writing you upload. By uploading, you grant twarc a non-exclusive, worldwide, royalty-free license to host, display, and distribute that content as part of the service.</p>
          <p className="mt-2">twarc is <strong>not</strong> the rights holder for fan art of existing anime / games. Use of those properties is governed by each rights holder&apos;s own fan-work policies.</p>
        </Section>

        <Section title="7. Anime metadata and third-party data">
          <p>The anime catalog (titles, synopsis, scores, character rosters, episode counts, streaming-platform links, cover images, etc.) is sourced from <a href="https://myanimelist.net" target="_blank" rel="noopener noreferrer" className="text-sakura hover:underline">MyAnimeList</a> via the public <a href="https://docs.api.jikan.moe" target="_blank" rel="noopener noreferrer" className="text-sakura hover:underline">Jikan API</a>. This data is provided &ldquo;as is&rdquo; — we don&apos;t guarantee its accuracy or completeness. twarc is not affiliated with MyAnimeList or DLE.</p>
        </Section>

        <Section title="8. Streaming-platform links">
          <p>Anime detail pages may include &ldquo;Watch on&rdquo; deep links to Crunchyroll, Netflix, Funimation, HIDIVE, Hulu, Bilibili, and other streaming services. These are convenience links — twarc does not host any video content, and we don&apos;t guarantee a series is available in your country. Subscriptions, access, and any commercial relationship are between you and the streaming service. twarc currently runs no affiliate program; if that ever changes, this section will be updated.</p>
        </Section>

        <Section title="9. Watchlist and lists">
          <p>Your anime list (status entries, scores, episodes watched, favorites) is publicly visible on your profile by default. Your personal notes on each entry are private. Don&apos;t put anything in a watchlist note you wouldn&apos;t mind us seeing during routine moderation.</p>
        </Section>

        <Section title="10. Comments and replies">
          <p>Comments on fan art posts and on blog posts are public, threaded, and signed with your username. @-mentions notify the named user. Replies notify the parent commenter. Blog comments also notify the blog author. Be respectful — section 4 applies.</p>
        </Section>

        <Section title="11. Achievements and badges">
          <p>Achievements and verified badges are awarded based on activity (post count, favorites earned, follower count, blog publications, daily-post streak, etc.) plus manual awards by staff (Verified Artist, etc.). We may revoke any badge that was awarded in error or as part of abuse.</p>
        </Section>

        <Section title="12. DMCA / takedowns">
          <p>If your work appears on twarc without your permission, email <a href="mailto:dmca@twarc.net" className="text-sakura hover:underline">dmca@twarc.net</a> with: (a) proof of ownership, (b) the URL of the offending post or blog, (c) a statement under penalty of perjury that you have authority to act. We respond to valid notices within 7 days.</p>
        </Section>

        <Section title="13. Termination">
          <p>You may delete your account at any time from <Link href="/dashboard/profile" className="text-sakura hover:underline">/dashboard/profile</Link>. We may suspend or terminate accounts that violate these terms, with or without notice.</p>
        </Section>

        <Section title="14. Disclaimers">
          <p>twarc is provided &ldquo;as is,&rdquo; without warranty of any kind. We are not liable for lost data, downtime, indirect damages, or content hosted by third parties we link out to (e.g. streaming services, embedded GIFs, MAL cover images).</p>
        </Section>

        <Section title="15. Changes">
          <p>We may update these terms; the &ldquo;last updated&rdquo; date above tracks the latest revision. Continued use after changes constitutes acceptance.</p>
        </Section>

        <Section title="16. Contact">
          <p>Questions: <a href="mailto:hello@twarc.net" className="text-sakura hover:underline">hello@twarc.net</a></p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display font-bold text-xl text-text-primary mb-2">{title}</h2>
      <div className="text-sm text-text-secondary">{children}</div>
    </section>
  );
}
