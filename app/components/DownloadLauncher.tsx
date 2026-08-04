"use client";

import { useEffect, useState } from "react";

const REPO = "RomainRichard42/CobbleStar-launcher";

// Voir toutes les versions (page d'information, pas un lien de téléchargement).
export const LAUNCHER_RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

// Repli figé sur le dernier .exe connu : garantit que le bouton télécharge
// toujours directement le fichier, même si l'API GitHub est indisponible.
export const FALLBACK_VERSION = "0.5.1";
export const FALLBACK_SIZE_MB = 100;
const FALLBACK_DOWNLOAD_URL = `https://github.com/${REPO}/releases/download/v${FALLBACK_VERSION}/CobbleStar-Launcher-${FALLBACK_VERSION}-win-x64.exe`;

export type LauncherRelease = { version: string; downloadUrl: string; sizeMb: number };

type GithubAsset = { name: string; browser_download_url: string; size: number };
type GithubRelease = { tag_name?: string; assets?: GithubAsset[] };

let cached: Promise<LauncherRelease | null> | null = null;

function fetchLatestRelease(): Promise<LauncherRelease | null> {
  if (!cached) {
    cached = fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then((response) => {
        if (!response.ok) throw new Error("GitHub indisponible");
        return response.json() as Promise<GithubRelease>;
      })
      .then((data) => {
        const asset = data.assets?.find((item) => item.name.endsWith(".exe"));
        if (!asset) return null;
        return {
          version: data.tag_name?.replace(/^v/, "") || "",
          downloadUrl: asset.browser_download_url,
          sizeMb: Math.round(asset.size / 1024 / 1024),
        };
      })
      .catch(() => null);
  }
  return cached;
}

// undefined = requête en cours, null = API indisponible : dans les deux cas
// useDownloadUrl() renvoie déjà un lien de fichier direct exploitable.
export function useLatestRelease() {
  const [release, setRelease] = useState<LauncherRelease | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    fetchLatestRelease().then((result) => { if (active) setRelease(result); });
    return () => { active = false; };
  }, []);
  return release;
}

// Toujours un lien direct vers le fichier .exe — jamais une page GitHub.
export function useDownloadUrl() {
  const release = useLatestRelease();
  return release?.downloadUrl || FALLBACK_DOWNLOAD_URL;
}
