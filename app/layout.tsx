import type { Metadata } from "next";
import "./tailwind.css";
import "./globals.css";
import "./design-system.css";
import "./site-refresh.css";
import "./atlas-public.css";
import "./motion-system.css";
import "./astral-public.css";
import "./player-polish.css";
import "./player-navigation.css";
import "./floating-navigation.css";
import { BASE_KEYWORDS, SITE_NAME, SITE_URL } from "@/app/lib/seo";
import StructuredData from "@/app/components/StructuredData";
import MotionDirector from "@/app/components/MotionDirector";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s | ${SITE_NAME}`,
    default: `${SITE_NAME} — Serveur Minecraft Cobblemon 1.21.1`,
  },
  description:
    "CobbleStar est un serveur Minecraft Cobblemon 1.21.1 en français. Découvre les mondes, les guides et la boutique. Ouverture publique à venir.",
  keywords: BASE_KEYWORDS,
  authors: [{ name: "CobbleStar" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "CobbleStar — Serveur Minecraft Cobblemon",
    description:
      "Serveur Minecraft Cobblemon francophone. Guides, boutique et communauté ; ouverture publique à venir.",
    images: [
      {
        url: "/media/cobblestar-logo-480.webp",
        width: 480,
        height: 480,
        alt: "Mascotte Dragonite de CobbleStar sur un nuage",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CobbleStar",
    description:
      "Serveur Minecraft Cobblemon 1.21.1 en français. Lance, vote, personnalise et progresse.",
    images: ["/media/cobblestar-logo-480.webp"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [{ url: "/media/favicon-96.png", sizes: "96x96", type: "image/png" }],
    shortcut: "/media/favicon-96.png",
    apple: "/media/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta httpEquiv="content-language" content="fr-FR" />
        <meta name="geo.region" content="FR" />
        <meta name="geo.placename" content="France" />
        <StructuredData />
      </head>
      <body>
        <MotionDirector />
        {children}
      </body>
    </html>
  );
}
