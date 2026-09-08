import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atelier des arènes | CobbleStar",
  description: "Gestion privée des champions, équipes et récompenses des arènes CobbleStar.",
  robots: { index: false, follow: false },
};
export default function ArenaLayout({ children }: { children: React.ReactNode }) { return children; }
