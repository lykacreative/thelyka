// Shapes the admin pages and the admin API exchange. Types only, safe to import anywhere.
import type { GalleryImage } from "@/lib/item-rules";

export type AdminItem = {
  id: string;
  title: string;
  category: "design" | "reviews" | "arts";
  year: string;
  date: string;
  note: string;
  artType: string | null;
  reviewType: string | null;
  gallery: GalleryImage[];
  coverIndex: number;
  featured: number | null;
  updatedAt: string;
};

export type AdminPost = {
  id: string;
  slug: string;
  title: string;
  date: string;
  year: string;
  excerpt: string;
  cover: string;
  content: string;
  oldSlugs: string[];
  updatedAt: string;
};

export type AdminEnvironment = {
  label: "live" | "preview" | "local";
  dbName: string;
  cloudinaryRoot: string;
  cloudinaryReady: boolean;
  signedInAs: string;
  copyLive: { enabled: boolean; reason: string | null; liveDbName: string };
  blogMigration: { imported: number; error?: string } | null;
};

export type DeleteSummary = {
  deleted: number;
  alreadyGone: number;
  kept: { publicId: string; reason: string }[];
  failed: { publicId: string; reason: string }[];
};
