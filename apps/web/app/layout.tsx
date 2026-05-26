import type { Metadata, Viewport } from "next";
import { Zen_Kaku_Gothic_New, Inter, Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { TopNav } from "@/components/TopNav";
import { Toaster } from "@/components/Toaster";

const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});
const notoJp = Noto_Sans_JP({
  variable: "--font-noto-jp",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const SITE = "https://twarc.net";
const LOGO = "https://cdn.twarc.net/twarc.png";
const FAVICON = "https://cdn.twarc.net/TW.png";
const DEFAULT_DESC =
  "The World of Anime, Rated & Curated. Free halal-friendly anime wallpapers, PFPs, profile pictures, icons & fan art — hand-drawn by humans, every post reviewed. No NSFW, no AI slop.";

export const viewport: Viewport = {
  themeColor: "#0A0F1A",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "twarc — The World of Anime, Rated & Curated",
    template: "%s · twarc",
  },
  description: DEFAULT_DESC,
  applicationName: "twarc",
  authors: [{ name: "twarc" }],
  creator: "twarc",
  publisher: "twarc",
  category: "art",
  keywords: [
    "anime wallpaper", "anime pfp", "anime profile picture", "anime icon",
    "anime art", "anime characters", "fan art", "hand-drawn art",
    "manga art", "anime illustrations", "anime gallery", "halal anime",
    "anime community", "free anime wallpaper", "anime aesthetic",
    "anime fan art gallery", "the world of anime rated and curated",
  ],
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: FAVICON, type: "image/png" },
      { url: FAVICON, sizes: "32x32", type: "image/png" },
      { url: FAVICON, sizes: "16x16", type: "image/png" },
    ],
    shortcut: FAVICON,
    apple: [{ url: FAVICON, sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE,
    siteName: "twarc",
    title: "twarc — The World of Anime, Rated & Curated",
    description: DEFAULT_DESC,
    images: [
      { url: LOGO, width: 2048, height: 1054, alt: "twarc" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "twarc — The World of Anime, Rated & Curated",
    description: DEFAULT_DESC,
    images: [LOGO],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, email: false, address: false },
  other: {
    // Google Sitelinks Search Box hint (also expressed via JSON-LD below)
    "google-site-verification": "",
  },
};

// WebSite + Organization JSON-LD. Google uses WebSite/SearchAction to expose
// an inline search box on the brand SERP; Organization establishes brand
// identity across knowledge-graph and rich results.
const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  name: "twarc",
  alternateName: "The World of Anime, Rated & Curated",
  url: SITE,
  description: DEFAULT_DESC,
  inLanguage: "en",
  isFamilyFriendly: true,
  publisher: { "@id": `${SITE}/#org` },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const ORG_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE}/#org`,
  name: "twarc",
  alternateName: "The World of Anime, Rated & Curated",
  url: SITE,
  description: "Halal-friendly, human-curated anime art gallery. Wallpapers, PFPs, fan art — no NSFW, no AI.",
  logo: { "@type": "ImageObject", url: LOGO, width: 2048, height: 1054, caption: "twarc" },
  image: LOGO,
  slogan: "The World of Anime, Rated & Curated",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${zenKaku.variable} ${inter.variable} ${notoJp.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD) }} />
        {/* eslint-disable-next-line react/no-danger */}
        <script type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TopNav />
          <Toaster />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
