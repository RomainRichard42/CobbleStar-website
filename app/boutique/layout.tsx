import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Boutique : Stars, grades et cosmétiques",
  description: "Découvre la boutique CobbleStar : Stars, grades Étoilé, Cosmique et Galactique, Battle Pass et jetons. Consulte les prix et les conditions de chaque offre.",
  openGraph: {title:"Boutique CobbleStar — Stars, grades et cosmétiques",description:"Compare les grades, consulte les prix en Stars et prépare ton compte lié pour les offres du serveur.",url:"/boutique/",type:"website",images:["/astral/assets/stars-640-v3.webp"]},
  twitter:{card:"summary_large_image",title:"Boutique CobbleStar — Stars, grades et cosmétiques",description:"Grades, Battle Pass, jetons et portefeuille Stars : le catalogue du serveur.",images:["/astral/assets/stars-640-v3.webp"]},
  keywords: [...BASE_KEYWORDS, "boutique cobblestar", "stars cobblestar", "cosmétiques minecraft", "achat minecraft"],
  robots: { index: true, follow: true },
  alternates: { canonical: "/boutique/" },
};

export default function BoutiqueLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
