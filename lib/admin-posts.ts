import type { Db, ObjectId } from "mongodb";
import { InputError, readText } from "@/lib/admin-data";
import { ConflictError } from "@/lib/admin-route";
import { blogCollection, ensureBlogIndexes } from "@/lib/blog-store";
import { isValidSlug, slugify } from "@/lib/blog-slug";
import { cloudinaryCloudName } from "@/lib/cloudinary";
import { cleanTitle, isValidDate } from "@/lib/item-rules";
import { readFeaturedFlag } from "@/lib/blog-featured";

export type PostInput = {
  title: string;
  slug: string;
  date: string;
  year: string;
  excerpt: string;
  cover: string;
  content: string;
  featured: boolean;
};

// What the blog editor sends, checked. The cover must be an image of this site's Cloudinary (the post page
// shows it through next/image, which only allows that cloud).
export function readPostInput(body: Record<string, unknown>): PostInput {
  const title = cleanTitle(readText(body.title, "Title", { required: true }));
  if (!title) throw new InputError("Give the post a title.");
  const slug = (readText(body.slug, "Address", { max: 200 }).trim() || slugify(title)).toLowerCase();
  if (!isValidSlug(slug)) throw new InputError("The address can only use a-z, 0-9 and single dashes.");
  const date = readText(body.date, "Date", { required: true }).trim();
  if (!date || !isValidDate(date)) throw new InputError("Pick the post's date.");
  const excerpt = readText(body.excerpt, "Excerpt", { max: 2000 }).replace(/\s+/g, " ").trim();
  const cover = readText(body.cover, "Cover", { max: 2000 }).trim();
  if (cover && !cover.startsWith(`https://res.cloudinary.com/${cloudinaryCloudName()}/`)) {
    throw new InputError("The cover must be an image uploaded to this site's Cloudinary.");
  }
  const content = readText(body.content, "Text", { max: 500000 }).replace(/\r\n?/g, "\n");
  if (!content.trim()) throw new InputError("The post has no text yet.");
  return { title, slug, date, year: date.slice(0, 4), excerpt, cover, content: content.trim(), featured: readFeaturedFlag(body.featured) };
}

// The address must be free: no other post uses it now. An old address of another post may be taken over
// (that post simply stops redirecting from it).
export async function claimSlug(db: Db, slug: string, ownId: ObjectId | null) {
  await ensureBlogIndexes(db);
  const collection = blogCollection(db);
  const clash = await collection.findOne(ownId ? { slug, _id: { $ne: ownId } } : { slug }, { projection: { title: 1 } });
  if (clash) throw new ConflictError(`"${clash.title}" already uses /blogs/${slug}. Pick another address.`);
  await collection.updateMany(ownId ? { oldSlugs: slug, _id: { $ne: ownId } } : { oldSlugs: slug }, { $pull: { oldSlugs: slug } });
}
