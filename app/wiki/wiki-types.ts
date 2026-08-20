export type WikiAccent = "cyan" | "pink" | "violet" | "mint" | "gold";

export type WikiBranch = {
  id: string; label: string; description: string; icon: string;
  accent: WikiAccent; order: number; visible: boolean;
};

export type WikiEntry = { title: string; text: string; asset?: string };

export type WikiBlock = {
  kind: string; text?: string; title?: string; tone?: WikiAccent;
  items?: Array<string | WikiEntry>; leftTitle?: string; rightTitle?: string;
  leftItems?: string[]; rightItems?: string[]; command?: string;
  from?: string; fromLabel?: string; to?: string; toLabel?: string; percent?: number;
};

export type WikiArticle = {
  id: string; branchId: string; title: string; summary: string; tags: string[];
  readingMinutes: number; order: number; published: boolean;
  hero: { asset: string; alt: string; species?: string; icon?: string }; blocks: WikiBlock[];
};

export type WikiDocument = {
  schemaVersion: number; title: string; subtitle: string;
  branches: WikiBranch[]; articles: WikiArticle[];
};

export type WikiEnvelope = { content: WikiDocument; version: number; updatedAt: string | null };
