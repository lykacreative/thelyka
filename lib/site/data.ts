// Server-side data for the public site: every item once (with its shareable key), the posts, the
// homepage's featured crate. React's cache() lets the layout and the page share one read per request.
import { cache } from "react";
import { getFeaturedItems, getPortfolioItems } from "@/lib/portfolio";
import { getBlogPosts, type BlogPost } from "@/lib/blogs";
import { toSiteItems, type SitePost } from "@/lib/site-items";

export const getSiteData = cache(async () => {
  const [raw, posts] = await Promise.all([getPortfolioItems(), getBlogPosts()]);
  const items = toSiteItems(raw);
  const keyById = new Map(raw.map((item, i) => [item.id, items[i].key]));
  return { items, posts, keyById };
});

export function toSitePost(post: BlogPost): SitePost {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    excerpt: post.excerpt,
    coverImage: post.coverImage ?? "",
    readTime: post.readTime,
    featured: post.featured
  };
}

// The hero crate: the admin's Featured list in its order; with nothing picked yet, the newest 8 designs.
export async function getFeaturedKeys() {
  const [{ items, keyById }, featured] = await Promise.all([getSiteData(), getFeaturedItems()]);
  const keys = featured.map((item) => keyById.get(item.id)).filter((key): key is string => !!key);
  if (keys.length) return keys;
  return items.filter((item) => item.category === "design").slice(0, 8).map((item) => item.key);
}

// His About photo: the original file in public/media, served as it is (no resizing or re-encoding), with its
// real size so the frame keeps its shape before the picture loads.
export type AboutImage = { src: string; width: number; height: number };
export const ABOUT_PHOTO: AboutImage | null = { src: "/media/about.webp", width: 2000, height: 2000 };
