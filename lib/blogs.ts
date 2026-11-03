import { unstable_cache } from "next/cache";
import { fixturesDir, readFixturePosts } from "@/lib/fixtures";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { readLegacyBlogPosts } from "@/lib/blog-legacy";
import { blogCollection, blogMigrationDone } from "@/lib/blog-store";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  year: string;
  coverImage?: string;
  readTime: number;
  // "Feature on homepage" in the admin: the homepage shows these (lib/blog-featured.ts).
  featured: boolean;
};

function calculateReadTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/**
 * All blog posts, newest first. Posts live in MongoDB (lib/blog-store.ts). Until the admin has copied the
 * old Cloudinary raw posts into MongoDB (it does that the first time it opens), those are read too, so the
 * site never loses a post during the switch.
 */
async function getBlogPostsUncached(): Promise<BlogPost[]> {
  // Local runs without a database (LYKA_FIXTURES, never on a deploy: lib/fixture-data.ts fixtureDirFrom).
  if (fixturesDir()) return readFixturePosts();

  const { connectToDatabase } = await import("@/lib/mongodb");
  const { db } = await connectToDatabase();
  const docs = await blogCollection(db).find({}).sort({ date: -1 }).toArray();

  const posts: BlogPost[] = docs.map((doc) => ({
    id: String(doc._id),
    slug: doc.slug,
    title: doc.title,
    date: doc.date,
    excerpt: doc.excerpt ?? "",
    content: doc.content ?? "",
    year: doc.year,
    coverImage: doc.cover || undefined,
    readTime: calculateReadTime(doc.content ?? ""),
    featured: doc.featured === true
  }));

  if (isCloudinaryConfigured() && !(await blogMigrationDone(db))) {
    const known = new Set(docs.flatMap((doc) => [doc.slug, ...(doc.oldSlugs ?? [])]));
    const legacy = await readLegacyBlogPosts(false).catch((error) => {
      console.error("Reading the old blog posts failed:", error);
      return [];
    });
    for (const post of legacy) {
      if (known.has(post.slug)) continue;
      posts.push({
        id: `legacy:${post.year}/${post.slug}`,
        slug: post.slug,
        title: post.title,
        date: post.date,
        excerpt: post.excerpt,
        content: post.content,
        year: post.year,
        coverImage: post.cover || undefined,
        readTime: calculateReadTime(post.content),
        featured: false
      });
    }
  }

  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

async function getBlogRedirectUncached(slug: string): Promise<string | null> {
  if (fixturesDir()) return null;

  const { connectToDatabase } = await import("@/lib/mongodb");
  const { db } = await connectToDatabase();
  const post = await blogCollection(db).findOne({ oldSlugs: slug }, { projection: { slug: 1 } });
  return post && post.slug !== slug ? post.slug : null;
}

/*
 * Cached for 5 minutes and tagged "blogs": every admin save or delete expires the tag and the blog paths at
 * once (lib/revalidate-site.ts), so the next visit shows the change.
 */
const getCachedBlogPosts = unstable_cache(getBlogPostsUncached, ["blog-posts-v2"], {
  revalidate: 300,
  tags: ["blogs"]
});

const getCachedBlogRedirect = unstable_cache(getBlogRedirectUncached, ["blog-redirect-v2"], {
  revalidate: 300,
  tags: ["blogs"]
});

export async function getBlogPosts() {
  return getCachedBlogPosts();
}

export async function getBlogPost(slug: string) {
  const posts = await getCachedBlogPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

// The current address of a renamed post (for a permanent redirect from its old address), or null.
export async function getBlogRedirect(slug: string) {
  return getCachedBlogRedirect(slug);
}
