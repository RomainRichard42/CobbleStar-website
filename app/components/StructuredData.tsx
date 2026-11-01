import { OG_IMAGE, SITE_NAME, SITE_URL } from "@/app/lib/seo";
import { DISCORD_INVITE } from '../lib/community-links';

// Describe the same verified publisher and website as the Astro public pages.
// Player counts and game reviews must not be fabricated in structured data.
const organizationStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organisation`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}${OG_IMAGE}`,
      description: "Communauté Minecraft Cobblemon francophone sur serveur 1.21.1.",
      sameAs: [DISCORD_INVITE],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      inLanguage: "fr-FR",
      publisher: { "@id": `${SITE_URL}/#organisation` },
    },
  ],
};

export default function StructuredData() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }} />;
}
