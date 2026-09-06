import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Actualités",
  description: "Les nouveautés du serveur CobbleStar, du modpack et de la communauté Cobblemon francophone.",
  keywords: [...BASE_KEYWORDS, "actualités cobblestar", "nouveautés cobblemon", "serveur minecraft français"],
  robots: { index: true, follow: true },
  alternates: { canonical: "/actualites/" },
};

export default function ActualitesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
