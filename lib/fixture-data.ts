// Turns the redesign's data files (items.json / blogs.json, copies of the live content) into the records the
// data functions return, for local runs without a database (lib/fixtures.ts). Pure so the tests can load it.
import type { PortfolioItem } from "./portfolio";
import type { BlogPost } from "./blogs";

type FixtureImage = { src: string; w?: number; h?: number };
type FixtureItem = {
  category: string;
  type?: string | null;
  title: string;
  date?: string;
  year?: string;
  note?: string;
  cover?: string;
  coverIndex?: number;
  images?: FixtureImage[];
  featured?: number;
};
type FixturePost = {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  featured?: boolean;
};

// The homepage stand-ins the mockups used until he picks his own in the admin, in this order.
export const FIXTURE_FEATURED = [
  "D017: CUT-OUT",
  "D016: Enough",
  "D015: Wanted",
  "D014: Phalaenopsis",
  "D012: T.G.E.P",
  "D001: Cosmonauts",
  "Poster Design 010: Hayao Miyazaki",
  "Brutalism Poster"
];

const CATEGORIES = ["design", "reviews", "arts"] as const;
const ART_TYPES = ["Sketches", "Photography", "Digital Art"] as const;
const REVIEW_TYPES = ["Movies", "Books"] as const;

export function readTimeOf(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function fixtureItems(json: unknown): PortfolioItem[] {
  const list = Array.isArray(json) ? json : (json as { items?: unknown })?.items;
  if (!Array.isArray(list)) return [];
  const items: PortfolioItem[] = [];

  (list as FixtureItem[]).forEach((raw, index) => {
    const category = CATEGORIES.find((value) => value === raw?.category);
    const images = (raw?.images ?? []).filter((image) => image && typeof image.src === "string" && image.src);
    if (!category || !images.length || typeof raw.title !== "string") return;
    const coverIndex = typeof raw.coverIndex === "number" && raw.coverIndex >= 0 && raw.coverIndex < images.length ? raw.coverIndex : 0;
    const cover = images[coverIndex];
    const width = cover.w && cover.w > 0 ? cover.w : 800;
    const height = cover.h && cover.h > 0 ? cover.h : 1000;
    const variantDimensions: PortfolioItem["variantDimensions"] = {};
    for (const image of images) variantDimensions[image.src] = { width: image.w || width, height: image.h || height };
    const rank = FIXTURE_FEATURED.indexOf(raw.title);

    items.push({
      id: `fixture-${index}`,
      src: cover.src,
      category,
      year: raw.year || (raw.date ?? "").slice(0, 4) || "2026",
      title: raw.title,
      note: raw.note ?? "",
      date: raw.date || undefined,
      artType: category === "arts" ? ART_TYPES.find((value) => value === raw.type) ?? "Sketches" : undefined,
      reviewType: category === "reviews" ? REVIEW_TYPES.find((value) => value === raw.type) ?? "Movies" : undefined,
      variants: images.map((image) => image.src),
      width,
      height,
      variantDimensions,
      gallery: images.length > 1 ? images.map((image) => ({ src: image.src, width: image.w, height: image.h })) : undefined,
      coverIndex,
      featured: typeof raw.featured === "number" ? raw.featured : rank >= 0 ? rank + 1 : undefined
    });
  });

  return items.sort((a, b) => b.year.localeCompare(a.year) || (b.date ?? "").localeCompare(a.date ?? ""));
}

export function fixturePosts(json: unknown): BlogPost[] {
  if (!Array.isArray(json)) return [];
  return (json as FixturePost[])
    .filter((post) => post && typeof post.slug === "string" && typeof post.title === "string" && typeof post.date === "string")
    .map((post) => ({
      id: `fixture:${post.slug}`,
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      year: post.date.slice(0, 4),
      coverImage: post.coverImage || undefined,
      readTime: readTimeOf(post.content ?? ""),
      featured: post.featured === true
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
