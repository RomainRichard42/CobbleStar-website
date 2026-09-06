import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Centre de contrôle | CobbleStar",
  description: "Statistiques privées des joueurs et services CobbleStar.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
