import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Déclaration de confidentialité CobbleStar : données personnelles, cookies, sécurité des comptes et droits RGPD.",
  keywords: [...BASE_KEYWORDS, "confidentialité", "RGPD", "politique de confidentialité", "cookies"],
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/confidentialite/",
  },
};

export default function ConfidentialiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
