import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Roadmap — Carte stellaire",
  description: "Explore la roadmap CobbleStar sous la forme d’une constellation interactive.",
  keywords: [...BASE_KEYWORDS, "roadmap CobbleStar", "nouveautés CobbleStar", "développement serveur Cobblemon"],
};

export default function RoadmapLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
