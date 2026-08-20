import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CobbleStar — Bêta Minecraft Cobblemon",
  description: "CobbleStar prépare sa bêta privée sur Minecraft 1.21.1 Fabric. Suis l'ouverture progressive du serveur Cobblemon.",
  icons: {
    icon: [{ url: "/cobblestar-logo.png", type: "image/png" }],
    shortcut: "/cobblestar-logo.png",
    apple: "/cobblestar-logo.png",
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
