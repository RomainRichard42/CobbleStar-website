import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Wiki",
  description: "Le guide officiel CobbleStar : progression, quêtes, collection et systèmes du serveur, synchronisé avec le jeu.",
  keywords: [...BASE_KEYWORDS, "wiki cobblestar", "guide cobblemon", "commandes cobblestar"],
  robots: { index: true, follow: true },
  alternates: { canonical: "/wiki/" },
};

export default function WikiLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
