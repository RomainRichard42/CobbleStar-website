import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CobbleStar — Serveur Minecraft Cobblemon",
  description: "Rejoins CobbleStar, un serveur Minecraft 1.21.1 Fabric dédié à Cobblemon. Télécharge le launcher officiel et pars à l'aventure.",
  icons: {
    icon: "/cobblestar-logo.png",
    shortcut: "/cobblestar-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
      </body>
    </html>
  );
}
