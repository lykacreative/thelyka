import type { Db, ObjectId } from "mongodb";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { readLegacyBlogPosts } from "@/lib/blog-legacy";

// Blog posts live in MongoDB (one document per post, found by its _id), so renaming a post or changing its
// date updates the same post. Old addresses are kept in oldSlugs and redirect to the current one.
export const BLOG_COLLECTION = "blog_posts";
export const SITE_META_COLLECTION = "site_meta";
export const BLOG_MIGRATION_ID = "blogs-from-cloudinary";

export type BlogPostDoc = {
  _id?: ObjectId;
  slug: string;
  title: string;
  date: string;
  year: string;
  excerpt: string;
  cover: string;
  content: string;
  oldSlugs: string[];
  // Shown on the homepage ("Feature on homepage" in the admin). Missing on older posts = not featured.
  featured?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SiteMetaDoc = { _id: string; migratedAt?: Date; imported?: number };

export function blogCollection(db: Db) {
  return db.collection<BlogPostDoc>(BLOG_COLLECTION);
}

export function siteMetaCollection(db: Db) {
  return db.collection<SiteMetaDoc>(SITE_META_COLLECTION);
}

export async function ensureBlogIndexes(db: Db) {
  await blogCollection(db).createIndex({ slug: 1 }, { unique: true, name: "slug_unique" });
  await blogCollection(db).createIndex({ oldSlugs: 1 }, { name: "old_slugs" });
}

export async function blogMigrationDone(db: Db) {
  return (await siteMetaCollection(db).findOne({ _id: BLOG_MIGRATION_ID })) !== null;
}

// One time per database: copy the posts from the old Cloudinary raw store into MongoDB (the raw files stay
// as a backup). Runs when the admin opens; until then the public pages read both stores (lib/blogs.ts).
export async function ensureBlogsMigrated(db: Db): Promise<{ imported: number; error?: string }> {
  if (await blogMigrationDone(db)) return { imported: 0 };
  if (!isCloudinaryConfigured()) return { imported: 0, error: "Cloudinary is not configured, so the old posts can't be read yet." };

  try {
    const legacy = await readLegacyBlogPosts(true);
    await ensureBlogIndexes(db);
    const existing = await blogCollection(db).find({}, { projection: { slug: 1, oldSlugs: 1 } }).toArray();
    const taken = new Set(existing.flatMap((post) => [post.slug, ...(post.oldSlugs ?? [])]));
    const now = new Date();
    const docs: BlogPostDoc[] = legacy
      .filter((post) => !taken.has(post.slug))
      .map((post) => ({
        slug: post.slug,
        title: post.title,
        date: post.date,
        year: /^\d{4}/.test(post.date) ? post.date.slice(0, 4) : post.year,
        excerpt: post.excerpt,
        cover: post.cover,
        content: post.content,
        oldSlugs: [],
        createdAt: now,
        updatedAt: now
      }));

    let imported = 0;
    if (docs.length) {
      try {
        const result = await blogCollection(db).insertMany(docs, { ordered: false });
        imported = result.insertedCount;
      } catch (error) {
        // Another request imported some of them at the same moment: the unique slug index keeps one copy.
        if ((error as { code?: number }).code !== 11000) throw error;
        imported = (error as { result?: { insertedCount?: number } }).result?.insertedCount ?? 0;
      }
    }
    await siteMetaCollection(db).updateOne(
      { _id: BLOG_MIGRATION_ID },
      { $setOnInsert: { migratedAt: now, imported } },
      { upsert: true }
    );
    return { imported };
  } catch (error) {
    console.error("Blog migration from Cloudinary failed:", error);
    return { imported: 0, error: error instanceof Error ? error.message : "Could not read the old blog posts." };
  }
}
