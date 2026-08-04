"use client";

import { useEffect, useState } from "react";

const REPO = "RomainRichard42/CobbleStar-launcher";

export const LAUNCHER_RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

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

// undefined = chargement en cours, null = indisponible (repli vers la page GitHub)
export function useLatestRelease() {
  const [release, setRelease] = useState<LauncherRelease | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    fetchLatestRelease().then((result) => { if (active) setRelease(result); });
    return () => { active = false; };
  }, []);
  return release;
}
