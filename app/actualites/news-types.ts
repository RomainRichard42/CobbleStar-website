export type NewsAccent = "cyan" | "pink" | "gold" | "mint" | "violet";

export type NewsArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  accent: NewsAccent;
  image: string;
  publishedAt: string;
  published: boolean;
  featured: boolean;
};

export type NewsDocument = {
  schemaVersion: number;
  title: string;
  subtitle: string;
  articles: NewsArticle[];
};

export type NewsEnvelope = { content: NewsDocument; version: number; updatedAt: string | null };
