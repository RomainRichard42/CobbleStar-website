import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Compte Joueur",
  description:
    "Créer ton compte CobbleStar, lier ton pseudo Minecraft et gérer tes Stars pour la boutique et le vote.",
  keywords: [...BASE_KEYWORDS, "connexion cobblestar", "compte joueur cobblestar", "lien minecraft"],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/compte/",
  },
};

export default function CompteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
