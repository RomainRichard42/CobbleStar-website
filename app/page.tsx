import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";
import { HOME_FAQ } from "@/app/lib/faq";
import HomePageClient from "./components/HomePageClient";
import FaqSection from "./components/FaqSection";
import FaqStructuredData from "./components/FaqStructuredData";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Page d’accueil du serveur CobbleStar (Minecraft Cobblemon 1.21.1). Launcher, bêta privée, boutique, vote et infos du serveur.",
  keywords: [...BASE_KEYWORDS, "serveur minecraft cobblestar", "cobblemon serveur minecraft", "béta privée cobblestar"],
};

export default function HomePage() {
  return <>
    <HomePageClient />
    <FaqSection title="Questions fréquentes sur le serveur" id="faq" items={HOME_FAQ} />
    <FaqStructuredData faqItems={HOME_FAQ} pageUrl="/" />
  </>;
}
