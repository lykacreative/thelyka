import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  isCloudinaryConfigured,
  readCloudinaryRaw,
  uploadCloudinaryRaw,
  deleteCloudinaryRaw,
} from "@/lib/cloudinary";
import {
  addBlogMetadata,
  readBlogMetadata,
  removeBlogMetadata,
  type BlogMetadata,
} from "@/lib/blog-metadata";

export const runtime = "nodejs";

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeTitle(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").trim();
}

function buildFrontmatter(data: {
  title: string;
  date: string;
  excerpt: string;
  cover?: string;
}) {
  const lines: string[] = ["---"];

  lines.push(`title: ${data.title}`);
  lines.push(`date: ${data.date}`);

  if (data.excerpt) {
    lines.push(`excerpt: ${data.excerpt}`);
  }

  if (data.cover) {
    lines.push(`cover: ${data.cover}`);
  }

  lines.push("---");

  return lines.join("\n");
}

function cloudinaryBlogPublicId(
  year: string,
  slug: string
) {
  return `thelyka/blogs/${year}/${slug}/index`;
}

type BlogPost = {
  slug: string;
  year: string;
  title: string;
  date: string;
  excerpt: string;
  cover: string;
  content: string;
  images: string[];
};

function isValidYear(year: string) {
  return /^\d{4}$/.test(year);
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured." },
      { status: 500 }
    );
  }

  try {
    const metadata = await readBlogMetadata();

    const posts: BlogPost[] = [];

    for (const post of metadata) {
      if (
        !post.slug ||
        !post.year ||
        !isValidYear(post.year)
      ) {
        continue;
      }

      const publicId = cloudinaryBlogPublicId(
        post.year,
        post.slug
      );

      const content = await readCloudinaryRaw(
        publicId
      );

      if (!content) {
        console.warn(
          `Blog Markdown not found in Cloudinary: ${publicId}`
        );
        continue;
      }

      /*
       * Blog images are already stored as
       * Cloudinary URLs inside the Markdown.
       *
       * We don't need to scan a local directory.
       */
      const imageMatches =
        content.match(
          /https?:\/\/res\.cloudinary\.com\/[^\s)"']+/g
        ) ?? [];

      const images = Array.from(
        new Set(imageMatches)
      );

      posts.push({
        slug: post.slug,
        year: post.year,
        title: post.title,
        date: post.date,
        excerpt: post.excerpt,
        cover: post.cover,
        content,
        images,
      });
    }

    posts.sort((a, b) =>
      b.date.localeCompare(a.date)
    );

    return NextResponse.json({
      posts,
    });
  } catch (error) {
    console.error(
      "Failed to read Cloudinary blogs:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load blogs.",
      },
      { status: 500 }
    );
  }
}

type SaveBody = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  year: string;
  cover?: string;
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured." },
      { status: 500 }
    );
  }

  let body: SaveBody;

  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const slug = sanitizeSlug(body.slug);

  if (!slug) {
    return NextResponse.json(
      { error: "Slug is required." },
      { status: 400 }
    );
  }

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 }
    );
  }

  if (!body.content?.trim()) {
    return NextResponse.json(
      { error: "Content is required." },
      { status: 400 }
    );
  }

  const year =
    body.year &&
    isValidYear(body.year.trim())
      ? body.year.trim()
      : new Date()
          .getFullYear()
          .toString();

  const date =
    body.date?.trim() ||
    new Date()
      .toISOString()
      .slice(0, 10);

  const title = sanitizeTitle(
    body.title
  );

  const excerpt =
    body.excerpt?.trim() || "";

  const cover =
    body.cover?.trim() || "";

  const frontmatter =
    buildFrontmatter({
      title,
      date,
      excerpt,
      cover: cover || undefined,
    });

  const file = `${frontmatter}\n\n${body.content.trim()}\n`;

  try {
    const publicId =
      cloudinaryBlogPublicId(
        year,
        slug
      );

    const secureUrl =
      await uploadCloudinaryRaw(
        file,
        publicId
      );

    const metadata: BlogMetadata = {
      slug,
      year,
      title,
      date,
      excerpt,
      cover,
    };

    await addBlogMetadata(
      metadata
    );

    return NextResponse.json({
      ok: true,
      slug,
      year,
      storage: "cloudinary",
      url: secureUrl,
    });
  } catch (error) {
    console.error(
      "Cloudinary blog save failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to save blog post.",
      },
      { status: 500 }
    );
  }
}

type DeleteBody = {
  slug: string;
  year: string;
};

export async function DELETE(
  request: Request
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary is not configured." },
      { status: 500 }
    );
  }

  let body: DeleteBody;

  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const slug = sanitizeSlug(body.slug);

  if (!slug) {
    return NextResponse.json(
      { error: "Slug is required." },
      { status: 400 }
    );
  }

  const year =
    body.year &&
    isValidYear(body.year.trim())
      ? body.year.trim()
      : new Date()
          .getFullYear()
          .toString();

  try {
    const publicId =
      cloudinaryBlogPublicId(
        year,
        slug
      );

    await deleteCloudinaryRaw(
      publicId
    );

    await removeBlogMetadata(
      slug,
      year
    );

    return NextResponse.json({
      ok: true,
      slug,
      year,
      storage: "cloudinary",
    });
  } catch (error) {
    console.error(
      "Cloudinary blog delete failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete blog post.",
      },
      { status: 500 }
    );
  }
}