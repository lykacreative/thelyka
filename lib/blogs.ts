import {
  readCloudinaryRaw,
  getBlogImagesFromCloudinary
} from "@/lib/cloudinary";

import {
  readBlogMetadata,
  type BlogMetadata,
} from "@/lib/blog-metadata";

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  year: string;
  coverImage?: string;
  readTime: number;
};

type BlogFrontmatter = {
  title?: string;
  date?: string;
  excerpt?: string;
  cover?: string;
};

function parseFrontmatter(
  raw: string
): {
  frontmatter: BlogFrontmatter;
  body: string;
} {
  const match = raw.match(
    /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/
  );

  if (!match) {
    return {
      frontmatter: {},
      body: raw.trim(),
    };
  }

  const frontmatter: BlogFrontmatter = {};

  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");

    if (colon === -1) {
      continue;
    }

    const key = line
      .slice(0, colon)
      .trim();

    let value = line
      .slice(colon + 1)
      .trim();

    if (
      (value.startsWith('"') &&
        value.endsWith('"')) ||
      (value.startsWith("'") &&
        value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "title") {
      frontmatter.title = value;
    } else if (key === "date") {
      frontmatter.date = value;
    } else if (key === "excerpt") {
      frontmatter.excerpt = value;
    } else if (key === "cover") {
      frontmatter.cover = value;
    }
  }

  return {
    frontmatter,
    body: match[2].trim(),
  };
}

function titleFromSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function calculateReadTime(
  content: string
): number {
  const words = content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const wordsPerMinute = 200;

  return Math.max(
    1,
    Math.ceil(
      words / wordsPerMinute
    )
  );
}

function cloudinaryBlogPublicId(
  year: string,
  slug: string
) {
  return `thelyka/blogs/${year}/${slug}/index`;
}

/**
 * Read a single blog post from Cloudinary.
 */
async function readBlogPost(
  metadata: BlogMetadata
): Promise<BlogPost | null> {
  const publicId =
    cloudinaryBlogPublicId(
      metadata.year,
      metadata.slug
    );

  const raw =
    await readCloudinaryRaw(
      publicId
    );

  if (!raw) {
    console.warn(
      `Blog Markdown not found in Cloudinary: ${publicId}`
    );

    return null;
  }

  const {
    frontmatter,
    body,
  } = parseFrontmatter(raw);

  /*
   * Metadata manifest is the source of truth
   * for listing information, while the Markdown
   * file contains the actual blog content.
   */
  const title =
    metadata.title ||
    frontmatter.title ||
    titleFromSlug(
      metadata.slug
    );

  const date =
    metadata.date ||
    frontmatter.date ||
    metadata.year;

  const excerpt =
    metadata.excerpt ||
    frontmatter.excerpt ||
    "";

  const cover =
    metadata.cover ||
    frontmatter.cover ||
    undefined;

  return {
    slug: metadata.slug,
    title,
    date,
    excerpt,
    content: body,
    year: metadata.year,
    coverImage: cover,
    readTime:
      calculateReadTime(body),
  };
}

/**
 * Get all blog posts.
 *
 * Blog metadata comes from the Cloudinary
 * metadata manifest.
 *
 * Blog Markdown content comes from Cloudinary.
 */
export async function getBlogPosts(): Promise<
  BlogPost[]
> {
  const metadata =
    await readBlogMetadata();

  if (!metadata.length) {
    return [];
  }

  const posts =
    await Promise.all(
      metadata.map((post) =>
        readBlogPost(post)
      )
    );

  return posts
    .filter(
      (
        post
      ): post is BlogPost =>
        post !== null
    )
    .sort((a, b) =>
      b.date.localeCompare(
        a.date
      )
    );
}

/**
 * Get a single blog post.
 */
export async function getBlogPost(
  slug: string
): Promise<BlogPost | null> {
  const metadata =
    await readBlogMetadata();

  const postMetadata =
    metadata.find(
      (post) =>
        post.slug === slug
    );

  if (!postMetadata) {
    return null;
  }

  return readBlogPost(
    postMetadata
  );
}

/**
 * Get images referenced by a blog.
 *
 * Blog images are stored directly in
 * Cloudinary and their URLs are inside
 * the Markdown content.
 */
export async function getBlogImages(
  year: string,
  slug: string
): Promise<string[]> {
  const publicId =
    cloudinaryBlogPublicId(
      year,
      slug
    );

  const raw =
    await readCloudinaryRaw(
      publicId
    );

  if (!raw) {
    return [];
  }

  const matches =
    raw.match(
      /https?:\/\/res\.cloudinary\.com\/[^\s)"']+/g
    ) ?? [];

  return Array.from(
    new Set(matches)
  );
}

/**
 * Get all blog images.
 *
 * Images are discovered from the Markdown
 * stored in Cloudinary.
 */
export async function getAllBlogImages(): Promise<
  {
    src: string;
    year: string;
    filename: string;
    publicId: string;
  }[]
> {
  return getBlogImagesFromCloudinary();
}

/**
 * Get years represented by blog posts.
 */
export async function getBlogYears(): Promise<
  string[]
> {
  const metadata =
    await readBlogMetadata();

  return Array.from(
    new Set(
      metadata
        .map(
          (post) => post.year
        )
        .filter(
          (year) =>
            /^\d{4}$/.test(year)
        )
    )
  ).sort(
    (a, b) =>
      b.localeCompare(a)
  );
}