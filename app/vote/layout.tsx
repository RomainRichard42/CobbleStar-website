import type { Metadata } from "next";
import { BASE_KEYWORDS } from "@/app/lib/seo";

export const metadata: Metadata = {
  title: "Voter pour CobbleStar : récompenses et classement",
  description: "Soutiens le serveur Cobblemon CobbleStar : retrouve les sites de vote, leurs délais, tes validations et les récompenses associées à ton compte Minecraft.",
  openGraph:{title:"Voter pour CobbleStar — Récompenses et classement",description:"Retrouve les sites de vote et les récompenses du serveur Cobblemon CobbleStar.",url:"/vote/",type:"website",images:["/media/logo-cercle-5-480.webp"]},
  twitter:{card:"summary_large_image",title:"Voter pour CobbleStar",description:"Sites de vote, validations et récompenses du serveur.",images:["/media/logo-cercle-5-480.webp"]},
  keywords: [...BASE_KEYWORDS, "vote cobblestar", "classement vote", "récompenses vote minecraft"],
  robots: { index: true, follow: true },
  alternates: { canonical: "/vote/" },
};

export default function VoteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
