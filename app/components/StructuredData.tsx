import { BASE_KEYWORDS, OG_IMAGE, SITE_NAME, SITE_URL } from "@/app/lib/seo";

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}${OG_IMAGE}`,
      description:
        "Communauté Minecraft Cobblemon francophone avec une bêta privée sur serveur 1.21.1.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#launcher`,
      name: `${SITE_NAME} Launcher`,
      applicationCategory: "GameApplication",
      operatingSystem: "Windows",
      url: `${SITE_URL}/`,
      description:
        "Launcher pour installer automatiquement le modpack CobbleStar (Minecraft Fabric 1.21.1).",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "EUR",
      },
    },
    {
      "@type": "GameServer",
      "@id": `${SITE_URL}/#server`,
      name: SITE_NAME,
      game: "Minecraft",
      ipAddress: "play.cobblestar-mc.fr",
      genre: "Cobblemon Survival",
      inLanguage: "fr",
      url: `${SITE_URL}/`,
      isAccessibleForFree: true,
      numberOfPlayers: "2-20",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
      description:
        "Serveur Minecraft Cobblemon francophone en bêta sur Fabric 1.21.1.",
    },
    {
      "@type": "VideoGame",
      "@id": `${SITE_URL}/#game`,
      name: "CobbleStar",
      description: "Serveur Minecraft Cobblemon avec élevage, équipes et mécaniques de progression personnalisées.",
      url: SITE_URL,
      playMode: "Multi-player",
      inLanguage: "fr-FR",
      genre: BASE_KEYWORDS.join(", "),
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description:
        "Site officiel du serveur Minecraft CobbleStar : launcher, boutique, vote et comptes joueurs.",
      publisher: {
        "@id": `${SITE_URL}/#organization`,
      },
    },
  ],
};

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
    />
  );
}
