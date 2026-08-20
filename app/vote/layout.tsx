import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Vote CobbleStar",
  description:
    "Système de vote du serveur CobbleStar : récompenses en jeu, cooldowns par portail et liaison Minecraft pour recevoir automatiquement les lots.",
  keywords: [...BASE_KEYWORDS, "vote cobblestar", "classement vote", "récompenses vote minecraft"],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/vote/",
  },
};

export default function VoteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
