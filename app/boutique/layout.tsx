import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Boutique CobbleStar",
  description:
    "Recharge tes Stars et découvre la boutique cosmétique de CobbleStar (Minecraft Cobblemon). Les achats seront livrés au bon compte Minecraft.",
  keywords: [...BASE_KEYWORDS, "boutique cobblestar", "stars cobblestar", "cosmétiques minecraft", "achat minecraft"],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/boutique/",
  },
};

export default function BoutiqueLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
