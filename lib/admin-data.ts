import { ObjectId, type Db, type Filter } from "mongodb";
import { categories, type Category } from "@/lib/portfolio";
import { artTypes, isArtType, defaultArtType } from "@/lib/art-types";
import { reviewTypes, isReviewType, defaultReviewType } from "@/lib/review-types";
import { PORTFOLIO_COLLECTION, type PortfolioItemDoc } from "@/lib/portfolio-collection";
import { blogCollection, type BlogPostDoc } from "@/lib/blog-store";
import { cloudinaryCloudName } from "@/lib/cloudinary";
import { cloudinaryRoot, isUnderRoot, publicIdFromCloudinaryUrl } from "@/lib/cloudinary-root";
import {
  cleanNote,
  cleanTitle,
  coverIndexOf,
  galleryOf,
  isFeaturedRank,
  isValidDate,
  isValidYear,
  type GalleryImage
} from "@/lib/item-rules";
import type { AdminItem, AdminPost } from "@/lib/admin-types";

export function portfolioCollection(db: Db) {
  return db.collection<PortfolioItemDoc>(PORTFOLIO_COLLECTION);
}

// Items created by the old admin have ObjectIds; accept a string _id too, just in case.
export function idFilter<T extends { _id?: unknown }>(id: string): Filter<T> | null {
  if (typeof id !== "string" || !id || id.length > 64) return null;
  if (ObjectId.isValid(id) && /^[0-9a-f]{24}$/i.test(id)) {
    return { _id: { $in: [new ObjectId(id), id] } } as unknown as Filter<T>;
  }
  return { _id: id } as unknown as Filter<T>;
}

function isoDate(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : "";
}

export function toAdminItem(doc: PortfolioItemDoc): AdminItem {
  const gallery = galleryOf(doc);
  const category = (categories as readonly string[]).includes(doc.category) ? (doc.category as Category) : "design";
  return {
    id: String(doc._id),
    title: typeof doc.title === "string" ? doc.title : "",
    category,
    year: typeof doc.year === "string" ? doc.year : "",
    date: typeof doc.date === "string" ? doc.date : "",
    note: typeof doc.note === "string" ? doc.note : "",
    artType: category === "arts" ? (doc.artType && isArtType(doc.artType) ? doc.artType : defaultArtType) : null,
    reviewType: category === "reviews" ? (doc.reviewType && isReviewType(doc.reviewType) ? doc.reviewType : defaultReviewType) : null,
    gallery,
    coverIndex: coverIndexOf(doc, gallery),
    featured: isFeaturedRank(doc.featured) ? doc.featured : null,
    updatedAt: isoDate(doc.updatedAt)
  };
}

export async function loadAdminItems(db: Db) {
  const docs = await portfolioCollection(db).find({}).toArray();
  return docs
    .map(toAdminItem)
    .sort((a, b) => b.year.localeCompare(a.year) || b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function toAdminPost(doc: BlogPostDoc): AdminPost {
  return {
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    date: doc.date,
    year: doc.year,
    excerpt: doc.excerpt ?? "",
    cover: doc.cover ?? "",
    content: doc.content ?? "",
    oldSlugs: Array.isArray(doc.oldSlugs) ? doc.oldSlugs : [],
    updatedAt: isoDate(doc.updatedAt)
  };
}

export async function loadAdminPosts(db: Db) {
  const docs = await blogCollection(db).find({}).sort({ date: -1 }).toArray();
  return docs.map(toAdminPost);
}

// ------------------------------------------------------------------ validating what the admin sends

export class InputError extends Error {}

export function readText(value: unknown, field: string, { max = 300, required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new InputError(`${field} is required.`);
    return "";
  }
  if (typeof value !== "string") throw new InputError(`${field} must be text.`);
  if (value.length > max) throw new InputError(`${field} is too long.`);
  return value;
}

export function readCategoryFields(body: Record<string, unknown>) {
  const category = readText(body.category, "Category", { required: true });
  if (!(categories as readonly string[]).includes(category)) throw new InputError("Unknown category.");
  const fields: { category: Category; artType: string | null; reviewType: string | null } = {
    category: category as Category,
    artType: null,
    reviewType: null
  };
  if (category === "arts") {
    const artType = readText(body.artType, "Art type") || defaultArtType;
    if (!isArtType(artType)) throw new InputError(`Art type must be one of: ${artTypes.join(", ")}.`);
    fields.artType = artType;
  }
  if (category === "reviews") {
    const reviewType = readText(body.reviewType, "Review type") || defaultReviewType;
    if (!isReviewType(reviewType)) throw new InputError(`Review type must be one of: ${reviewTypes.join(", ")}.`);
    fields.reviewType = reviewType;
  }
  return fields;
}

export function readBasics(body: Record<string, unknown>) {
  const title = cleanTitle(readText(body.title, "Title", { required: true }));
  if (!title) throw new InputError("Give it a title.");
  const year = readText(body.year, "Year", { required: true }).trim();
  if (!isValidYear(year)) throw new InputError("Year must be 4 digits, like 2024.");
  const date = readText(body.date, "Date").trim();
  if (!isValidDate(date)) throw new InputError("Date must be a real date (YYYY-MM-DD) or empty.");
  const note = cleanNote(readText(body.note, "Note", { max: 20000 }));
  return { title, year, date: date || null, note: note || null };
}

// A gallery from the admin. Images the item already had keep their stored details; new ones must be
// fresh uploads of this cloud, under this site's Cloudinary folder, whose URL matches their public id.
export function readGallery(value: unknown, existing: GalleryImage[]): GalleryImage[] {
  if (!Array.isArray(value) || value.length === 0) throw new InputError("An item needs at least one image.");
  if (value.length > 200) throw new InputError("Too many images in one item.");
  const known = new Map(existing.map((image) => [image.src, image]));
  const root = cloudinaryRoot(process.env);
  const cloudName = cloudinaryCloudName();
  const seen = new Set<string>();
  const gallery: GalleryImage[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") throw new InputError("Invalid image.");
    const image = raw as Record<string, unknown>;
    const src = typeof image.src === "string" ? image.src.trim() : "";
    if (!src || seen.has(src)) throw new InputError("An image is missing or listed twice.");
    seen.add(src);
    const old = known.get(src);
    if (old) {
      gallery.push(old);
      continue;
    }
    const publicId = typeof image.cloudinaryPublicId === "string" ? image.cloudinaryPublicId : "";
    if (!cloudName || publicIdFromCloudinaryUrl(src, cloudName) !== publicId || !isUnderRoot(publicId, root)) {
      throw new InputError("A new image isn't a fresh upload to this site's Cloudinary folder.");
    }
    const width = typeof image.width === "number" && image.width > 0 ? Math.round(image.width) : undefined;
    const height = typeof image.height === "number" && image.height > 0 ? Math.round(image.height) : undefined;
    gallery.push({ src, cloudinaryPublicId: publicId, ...(width ? { width } : {}), ...(height ? { height } : {}) });
  }
  return gallery;
}

export function readCoverIndex(body: Record<string, unknown>, gallery: GalleryImage[]) {
  if (typeof body.coverSrc === "string") {
    const index = gallery.findIndex((image) => image.src === body.coverSrc);
    if (index >= 0) return index;
  }
  if (typeof body.coverIndex === "number" && Number.isInteger(body.coverIndex) && gallery[body.coverIndex]) {
    return body.coverIndex;
  }
  return 0;
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new InputError("The request body must be a JSON object.");
}
