import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Votes",
  description: "Soutiens CobbleStar sur les portails de vote et reçois automatiquement tes récompenses en jeu.",
  keywords: [...BASE_KEYWORDS, "vote cobblestar", "classement vote", "récompenses vote minecraft"],
  robots: { index: true, follow: true },
  alternates: { canonical: "/vote/" },
};

export default function VoteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
