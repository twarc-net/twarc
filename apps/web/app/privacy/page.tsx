import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — twarc",
  description:
    "How twarc collects, uses, and protects your information. No third-party ad networks, no selling of data, minimum-necessary collection. Covers accounts, posts, blog, watchlist, and notifications.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-05-26";

export default function PrivacyPage() {
  return (
    <main className="flex-1 mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tight mb-3">
        Privacy <span className="text-sakura">Policy</span>
      </h1>
      <p className="text-text-muted text-xs font-mono uppercase tracking-[0.2em] mb-10">
        Last updated: {UPDATED}
      </p>

      <div className="flex flex-col gap-7 text-text-secondary leading-relaxed">
        <Section title="What we collect">
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-text-primary">Account data:</strong> username, email, password (bcrypt-hashed), optional display name, optional bio, optional avatar.</li>
            <li><strong className="text-text-primary">Content you create:</strong> posts (fan art images, titles, descriptions, tags), blog posts (HTML body + cover images + author-uploaded inline images), comments, replies, mentions.</li>
            <li><strong className="text-text-primary">Activity:</strong> favorites, follows, anime list entries (status + score + episodes-watched + private notes), achievement progress, comment scores, view counts on posts you visit.</li>
            <li><strong className="text-text-primary">Notifications:</strong> records of follower / mention / reply / approval / achievement events directed at you, plus your live notification-stream connection state.</li>
            <li><strong className="text-text-primary">Technical:</strong> IP address (for rate-limiting + abuse prevention), browser user-agent, basic request logs.</li>
            <li><strong className="text-text-primary">Cookies:</strong> session cookie for login, CSRF token. No third-party advertising cookies.</li>
            <li><strong className="text-text-primary">Local storage:</strong> minor UI preferences (last sort order, etc.).</li>
          </ul>
        </Section>

        <Section title="What we don't collect">
          <ul className="list-disc list-inside space-y-1">
            <li>We don&apos;t sell your data to anyone. Ever.</li>
            <li>We don&apos;t run third-party ad networks (no Google Ads, no Meta pixels).</li>
            <li>We don&apos;t track you across other sites.</li>
            <li>We don&apos;t require your real name.</li>
            <li>We don&apos;t collect biometrics, location, contacts, or device identifiers beyond IP + user-agent.</li>
          </ul>
        </Section>

        <Section title="How we use data">
          <ul className="list-disc list-inside space-y-1">
            <li>Operating the service — showing your posts/blogs, routing notifications, ranking content.</li>
            <li>Moderation, abuse prevention, and DMCA response.</li>
            <li>Awarding achievements based on your activity.</li>
            <li>Aggregate analytics (no personally-identifying info shared with any third party).</li>
          </ul>
        </Section>

        <Section title="What's public by default">
          <ul className="list-disc list-inside space-y-1">
            <li>Your profile page (username, display name, bio, avatar, badges, achievement progress, post count, follower / following lists, join date).</li>
            <li>Posts and blog articles you publish.</li>
            <li>Comments and replies you write.</li>
            <li>Your anime list status and per-anime scores — except <strong className="text-text-primary">private notes</strong>, which are visible only to you.</li>
            <li>Who you follow and who follows you.</li>
          </ul>
        </Section>

        <Section title="Third-party data we display">
          <p>Anime metadata, cover images, and character portraits are pulled from <a href="https://myanimelist.net" target="_blank" rel="noopener noreferrer" className="text-sakura hover:underline">MyAnimeList</a> via the public Jikan API and rendered alongside our own content. Cover images are served from <code className="font-mono text-cyber">cdn.myanimelist.net</code>. Streaming-platform deep links target the platforms&apos; own URLs — when you click one, you leave twarc and that service&apos;s privacy policy applies.</p>
        </Section>

        <Section title="Children">
          <p>twarc is not directed at children under 13. If we learn we have collected data from a child under 13 without parental consent, we will delete it.</p>
        </Section>

        <Section title="Retention">
          <p>Active account data is retained while your account exists. When you delete your account:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Your user row is removed.</li>
            <li>Your watchlist, follows, favorites, and notifications are removed.</li>
            <li>Your posts and blog articles may be retained anonymized (author replaced with &ldquo;[deleted]&rdquo;) so comment threads on them remain intact.</li>
            <li>Comments you posted may be retained anonymized for the same reason.</li>
          </ul>
        </Section>

        <Section title="Your rights">
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-text-primary">Access:</strong> view all your data through the dashboard.</li>
            <li><strong className="text-text-primary">Correct:</strong> edit profile, bio, posts, blog articles, watchlist entries any time.</li>
            <li><strong className="text-text-primary">Delete:</strong> remove your account from <a href="/dashboard/profile" className="text-sakura hover:underline">/dashboard/profile</a>.</li>
            <li><strong className="text-text-primary">Export:</strong> email <a href="mailto:privacy@twarc.net" className="text-sakura hover:underline">privacy@twarc.net</a> for a JSON dump.</li>
            <li><strong className="text-text-primary">Object:</strong> email us to opt out of any specific processing.</li>
          </ul>
        </Section>

        <Section title="Real-time notifications">
          <p>While the site is open in a foreground tab, your browser maintains a long-lived <a href="https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events" target="_blank" rel="noopener noreferrer" className="text-sakura hover:underline">Server-Sent Events</a> connection to receive live notifications. The connection is closed automatically when the tab is hidden. We log only normal server access info for this stream — no message contents leave our server.</p>
        </Section>

        <Section title="Security">
          <p>We use HTTPS site-wide, hash passwords with bcrypt, and minimize sensitive-data exposure. No service is 100% secure; if we discover a breach affecting you, we will notify you.</p>
        </Section>

        <Section title="Cookies & local storage">
          <p>twarc uses a session cookie to keep you logged in and a CSRF cookie for form security. We use local storage for UI preferences (theme, sort order). No third-party trackers.</p>
        </Section>

        <Section title="Outbound links">
          <p>Clicking a streaming-platform button, an embedded image hotlinked to a CDN, or a user-submitted external link takes you off twarc. Once you leave, the destination&apos;s privacy practices apply, not ours.</p>
        </Section>

        <Section title="Contact">
          <p>Privacy questions: <a href="mailto:privacy@twarc.net" className="text-sakura hover:underline">privacy@twarc.net</a></p>
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
