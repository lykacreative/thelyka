// The public site's view of the portfolio: one compact record per item with a stable, shareable key
// ("design/d017-cut-out"), every image at its stored size, and the cover's place in the gallery.
// Pure (type-only imports) so the tests can load it and client components can share the helpers.
import type { PortfolioItem } from "./portfolio";

export type SiteCategory = "design" | "arts" | "reviews";

export type SiteImage = { src: string; w: number; h: number };

export type SiteItem = {
  key: string;
  category: SiteCategory;
  type: string | null;
  title: string;
  date: string;
  year: string;
  note: string;
  cover: number;
  images: SiteImage[];
};

export type SitePost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  coverImage: string;
  readTime: number;
  featured: boolean;
};

const COMBINING_MARKS = /[̀-ͯ]/g;
const NOT_LETTER_OR_DIGIT = new RegExp("[^\\p{L}\\p{N}]+", "gu");

export function slugify(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(COMBINING_MARKS, "")
      .toLowerCase()
      .replace(NOT_LETTER_OR_DIGIT, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

// Notes that are only a leftover data reference ("$15") are no note.
export function cleanSiteNote(note: string | null | undefined) {
  return !note || /^\s*\$\d+\s*$/.test(note) ? "" : note;
}

function imagesOf(item: PortfolioItem): SiteImage[] {
  const fallback = { width: item.width, height: item.height };
  const sized = (src: string, width?: number, height?: number): SiteImage => {
    const known = item.variantDimensions?.[src];
    return {
      src,
      w: width && width > 0 ? width : known?.width ?? fallback.width,
      h: height && height > 0 ? height : known?.height ?? fallback.height
    };
  };
  if (item.gallery && item.gallery.length) return item.gallery.map((image) => sized(image.src, image.width, image.height));
  const variants = item.variants && item.variants.length ? item.variants : [item.src];
  return variants.map((src) => sized(src));
}

// Keys are "<category>/<slug of the title>"; two items with the same title in one category get the date
// added, and any clash left after that a counter. Items come newest first, so keys stay put as work is added.
export function toSiteItems(items: PortfolioItem[]): SiteItem[] {
  const seen = new Map<string, number>();
  const slugs = items.map((item) => {
    const slug = slugify(item.title);
    const id = `${item.category}/${slug}`;
    seen.set(id, (seen.get(id) ?? 0) + 1);
    return slug;
  });
  const used = new Set<string>();

  return items.map((item, index) => {
    let slug = slugs[index];
    if ((seen.get(`${item.category}/${slug}`) ?? 0) > 1 && item.date) slug += `-${item.date}`;
    let key = `${item.category}/${slug}`;
    for (let n = 2; used.has(key); n++) key = `${item.category}/${slug}-${n}`;
    used.add(key);

    const images = imagesOf(item);
    const byCover = images.findIndex((image) => image.src === item.src);
    const cover =
      byCover >= 0
        ? byCover
        : typeof item.coverIndex === "number" && item.coverIndex >= 0 && item.coverIndex < images.length
          ? item.coverIndex
          : 0;

    return {
      key,
      category: item.category,
      type: item.artType ?? item.reviewType ?? null,
      title: item.title,
      date: item.date ?? "",
      year: item.year,
      note: cleanSiteNote(item.note),
      cover,
      images
    };
  });
}

export function coverOf(item: SiteItem): SiteImage {
  return item.images[item.cover] ?? item.images[0];
}

// What a piece shows before it's opened (crate, shelf, walls): Cloudinary's copy with the short side at 1080 px,
// made on the fly from the original, which is never changed and is what the pop-up shows. A picture that's already
// that size or smaller, or isn't on Cloudinary, is the original file as it is. `short` 200 = the pop-up's thumbnails.
const CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;
export function viewSrc(image: SiteImage, short = 1080): string {
  const match = image.src.match(CLOUDINARY_UPLOAD);
  const side = Math.min(image.w, image.h);
  if (!match || !(side > short)) return image.src;
  const w = Math.round((image.w * short) / side);
  const h = Math.round((image.h * short) / side);
  return `${match[1]}c_limit,w_${w},h_${h},q_auto:best,f_auto/${match[2]}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-06-29" -> "29 Jun 2026". A missing or partial date shows what there is.
export function formatDate(date: string | null | undefined) {
  const match = String(date ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return String(date ?? "");
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1] ?? ""} ${match[1]}`;
}

// The date an item shows: its day if it has one, else its year.
export function itemDate(item: Pick<SiteItem, "date" | "year">) {
  return item.date ? formatDate(item.date) : item.year;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

// The newest item by date (ties: the first, which is the newest by the site's own order).
export function newestItem(items: SiteItem[]) {
  return items.reduce<SiteItem | null>((best, item) => (!best || (item.date || item.year) > (best.date || best.year) ? item : best), null);
}

// A blog post search: every word must appear in the title, the excerpt or the text (case and accents ignored).
export function postMatches(post: { title: string; excerpt?: string; text?: string }, query: string) {
  const fold = (value: string) => value.normalize("NFKD").replace(COMBINING_MARKS, "").toLowerCase();
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = fold(`${post.title}\n${post.excerpt ?? ""}\n${post.text ?? ""}`);
  return words.every((word) => haystack.includes(word));
}

export type PostSort = "newest" | "oldest" | "title";

export function sortPosts<T extends { title: string; date: string }>(posts: T[], sort: PostSort): T[] {
  const list = posts.slice();
  if (sort === "title") return list.sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base" }));
  list.sort((a, b) => b.date.localeCompare(a.date));
  return sort === "oldest" ? list.reverse() : list;
}

// Markdown to plain words, for searching a post's text.
export function plainText(markdown: string) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^:::.*$/gm, " ")
    .replace(/[#>*_`~-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
