import fs from "node:fs";
import path from "node:path";

export type BlogPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  year: string;
  coverImage?: string;
};

type BlogFrontmatter = {
  title?: string;
  date?: string;
  excerpt?: string;
  cover?: string;
};

const blogsDir = path.join(process.cwd(), "public", "blogs");
const mediaDir = path.join(process.cwd(), "public", "media");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

function parseFrontmatter(raw: string): { frontmatter: BlogFrontmatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw.trim() };

  const frontmatter: BlogFrontmatter = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === "title") frontmatter.title = value;
    else if (key === "date") frontmatter.date = value;
    else if (key === "excerpt") frontmatter.excerpt = value;
    else if (key === "cover") frontmatter.cover = value;
  }

  return { frontmatter, body: match[2].trim() };
}

function titleFromSlug(slug: string) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function listImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

export function getBlogPosts(): BlogPost[] {
  if (!fs.existsSync(blogsDir)) return [];

  const posts: BlogPost[] = [];

  const years = fs
    .readdirSync(blogsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => entry.name);

  for (const year of years) {
    const yearDir = path.join(blogsDir, year);
    const slugs = fs
      .readdirSync(yearDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    const mediaYearDir = path.join(mediaDir, year);
    const mediaImages = listImageFiles(mediaYearDir);

    for (const slug of slugs) {
      const postDir = path.join(yearDir, slug);
      const mdPath = path.join(postDir, "index.md");

      if (!fs.existsSync(mdPath)) continue;

      const raw = fs.readFileSync(mdPath, "utf8");
      const { frontmatter, body } = parseFrontmatter(raw);

      const coverImage = frontmatter.cover
        ? frontmatter.cover.startsWith("/media/")
          ? frontmatter.cover
          : `/media/${year}/${frontmatter.cover}`
        : mediaImages.length > 0
          ? `/media/${year}/${mediaImages[0]}`
          : undefined;

      posts.push({
        slug,
        title: frontmatter.title ?? titleFromSlug(slug),
        date: frontmatter.date ?? year,
        excerpt: frontmatter.excerpt ?? "",
        content: body,
        year,
        coverImage
      });
    }
  }

  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export function getBlogPost(slug: string): BlogPost | null {
  return getBlogPosts().find((post) => post.slug === slug) ?? null;
}

export function getBlogImages(year: string, slug: string): string[] {
  const mediaYearDir = path.join(mediaDir, year);
  return listImageFiles(mediaYearDir).map((file) => `/media/${year}/${file}`);
}

export function getAllBlogImages(): { src: string; year: string; filename: string }[] {
  if (!fs.existsSync(mediaDir)) return [];

  const result: { src: string; year: string; filename: string }[] = [];

  const years = fs
    .readdirSync(mediaDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => entry.name);

  for (const year of years) {
    const mediaYearDir = path.join(mediaDir, year);
    const files = listImageFiles(mediaYearDir);
    for (const filename of files) {
      result.push({
        src: `/media/${year}/${filename}`,
        year,
        filename
      });
    }
  }

  return result;
}

export function getBlogYears(): string[] {
  if (!fs.existsSync(blogsDir)) return [];
  return fs
    .readdirSync(blogsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^\d{4}$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => b.localeCompare(a));
}