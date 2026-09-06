import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";
import { HOME_FAQ } from "@/app/lib/faq";
import FaqStructuredData from "./components/FaqStructuredData";
import { AtlasLanding } from "./maquettes/site-atlas/page";

export const metadata: Metadata = {
  title: "Accueil",
  description:
    "Page d’accueil du serveur CobbleStar (Minecraft Cobblemon 1.21.1). Launcher, boutique, votes, progression et informations du serveur.",
  keywords: [...BASE_KEYWORDS, "serveur minecraft cobblestar", "cobblemon serveur minecraft", "aventure cobblestar"],
};

export default function HomePage() {
  return <>
    <AtlasLanding home />
    <FaqStructuredData faqItems={HOME_FAQ} pageUrl="/" />
  </>;
}
