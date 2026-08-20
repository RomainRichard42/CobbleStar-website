import type { Metadata } from "next";
import "./globals.css";
import { BASE_KEYWORDS, SITE_NAME, SITE_URL } from "@/app/lib/seo";
import StructuredData from "@/app/components/StructuredData";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: `%s | ${SITE_NAME}`,
    default: `${SITE_NAME} — Serveur Minecraft Cobblemon 1.21.1`,
  },
  description:
    "CobbleStar est un serveur Minecraft Cobblemon 1.21.1 en français. Rejoins le launcher, la boutique, le programme de vote et une aventure communautaire en bêta.",
  keywords: BASE_KEYWORDS,
  authors: [{ name: "CobbleStar" }],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "CobbleStar — Serveur Minecraft Cobblemon",
    description:
      "Serveur Minecraft Cobblemon francophone en bêta. Accès, launcher, boutique et vote directement liés à ton compte.",
    images: [
      {
        url: "/cobblestar-logo.png",
        width: 1024,
        height: 1024,
        alt: "Logo CobbleStar",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@cobblestar_mc",
    creator: "@cobblestar_mc",
    title: "CobbleStar",
    description:
      "Serveur Minecraft Cobblemon 1.21.1 en français. Lance, vote, personnalise et progresse.",
    images: ["/cobblestar-logo.png"],
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
    icon: [{ url: "/cobblestar-logo.png", sizes: "any" }],
    shortcut: "/cobblestar-logo.png",
    apple: "/cobblestar-logo.png",
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
        {children}
      </body>
    </html>
  );
}
