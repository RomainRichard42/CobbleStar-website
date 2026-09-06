import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Roadmap",
  description: "Découvre les systèmes disponibles, les améliorations en cours et les prochaines évolutions de CobbleStar.",
  keywords: [...BASE_KEYWORDS, "roadmap CobbleStar", "nouveautés CobbleStar", "développement serveur Cobblemon"],
};

export default function RoadmapLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
