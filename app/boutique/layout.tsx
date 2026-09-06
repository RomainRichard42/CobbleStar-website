import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Recharge tes Stars et découvre les collections cosmétiques CobbleStar, sans avantage compétitif.",
  keywords: [...BASE_KEYWORDS, "boutique cobblestar", "stars cobblestar", "cosmétiques minecraft", "achat minecraft"],
  robots: { index: true, follow: true },
  alternates: { canonical: "/boutique/" },
};

export default function BoutiqueLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
