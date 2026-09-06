import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Espace joueur",
  description: "Connecte ton profil Discord à CobbleStar puis relie-le en toute sécurité à ton joueur Minecraft avec /link.",
  keywords: [...BASE_KEYWORDS, "connexion discord cobblestar", "compte joueur cobblestar", "lien minecraft"],
  robots: { index: true, follow: true },
  alternates: { canonical: "/compte/" },
};

export default function CompteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
