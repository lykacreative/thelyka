
import {
  readCloudinaryRaw,
  uploadCloudinaryRaw,
} from "@/lib/cloudinary";

export const BLOG_METADATA_PUBLIC_ID =
  "thelyka/blogs/metadata";

export type BlogMetadata = {
  slug: string;
  year: string;
  title: string;
  date: string;
  excerpt: string;
  cover: string;
};

export async function readBlogMetadata(): Promise<BlogMetadata[]> {
  const raw = await readCloudinaryRaw(
    BLOG_METADATA_PUBLIC_ID
  );

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    console.error("Invalid blog metadata JSON.");
    return [];
  }
}

export async function writeBlogMetadata(
  posts: BlogMetadata[]
) {
  await uploadCloudinaryRaw(
    JSON.stringify(posts, null, 2),
    BLOG_METADATA_PUBLIC_ID
  );
}

export async function addBlogMetadata(
  post: BlogMetadata
) {
  const posts = await readBlogMetadata();

  const existingIndex = posts.findIndex(
    (item) =>
      item.slug === post.slug &&
      item.year === post.year
  );

  if (existingIndex >= 0) {
    posts[existingIndex] = post;
  } else {
    posts.push(post);
  }

  posts.sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  await writeBlogMetadata(posts);
}

export async function removeBlogMetadata(
  slug: string,
  year: string
) {
  const posts = await readBlogMetadata();

  const filtered = posts.filter(
    (post) =>
      !(post.slug === slug && post.year === year)
  );

  await writeBlogMetadata(filtered);
}
