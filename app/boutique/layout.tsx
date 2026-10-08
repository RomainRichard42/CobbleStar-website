import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Recharge tes Stars et découvre les cosmétiques, services et grades mensuels de CobbleStar.",
  keywords: [...BASE_KEYWORDS, "boutique cobblestar", "stars cobblestar", "cosmétiques minecraft", "achat minecraft"],
  robots: { index: true, follow: true },
  alternates: { canonical: "/boutique/" },
};

export default function BoutiqueLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
