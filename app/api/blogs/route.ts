import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const runtime = "nodejs";

const blogsDir = path.join(process.cwd(), "public", "blogs");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

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
  if (data.excerpt) lines.push(`excerpt: ${data.excerpt}`);
  if (data.cover) lines.push(`cover: ${data.cover}`);
  lines.push("---");
  return lines.join("\n");
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { title: "", date: "", excerpt: "", cover: "", content: raw.trim() };

  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[line.slice(0, colon).trim()] = value;
  }

  return {
    title: meta.title ?? "",
    date: meta.date ?? "",
    excerpt: meta.excerpt ?? "",
    cover: meta.cover ?? "",
    content: match[2].trim()
  };
}

async function listImageFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return imageExtensions.has(ext);
    }).sort();
  } catch {
    return [];
  }
}

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const result: {
    slug: string;
    year: string;
    title: string;
    date: string;
    excerpt: string;
    cover: string;
    content: string;
    images: string[];
  }[] = [];

  try {
    const years = await fs.readdir(blogsDir);
    for (const year of years) {
      if (!/^\d{4}$/.test(year)) continue;
      const yearPath = path.join(blogsDir, year);
      const stat = await fs.stat(yearPath);
      if (!stat.isDirectory()) continue;

      const slugs = await fs.readdir(yearPath);
      for (const slug of slugs) {
        const postDir = path.join(yearPath, slug);
        const mdPath = path.join(postDir, "index.md");
        try {
          await fs.access(mdPath);
          const raw = await fs.readFile(mdPath, "utf8");
          const { title, date, excerpt, cover, content } = parseFrontmatter(raw);
          const images = (await listImageFiles(postDir)).map((f) => `/blogs/${year}/${slug}/${f}`);
          result.push({ slug, year, title: title || slug, date: date || year, excerpt, cover, content, images });
        } catch {
          // no index.md, skip
        }
      }
    }
  } catch {
    // blogsDir doesn't exist yet
  }

  return NextResponse.json({ posts: result.sort((a, b) => b.date.localeCompare(a.date)) });
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
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const slug = sanitizeSlug(body.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Content is required." }, { status: 400 });
  }

  const year = body.year && /^\d{4}$/.test(body.year.trim()) ? body.year.trim() : new Date().getFullYear().toString();
  const date = body.date?.trim() || new Date().toISOString().slice(0, 10);

  const postDir = path.join(blogsDir, year, slug);
  await fs.mkdir(postDir, { recursive: true });

  const frontmatter = buildFrontmatter({
    title: sanitizeTitle(body.title),
    date,
    excerpt: body.excerpt?.trim() || "",
    cover: body.cover?.trim() || undefined
  });

  const file = `${frontmatter}\n\n${body.content.trim()}\n`;
  await fs.writeFile(path.join(postDir, "index.md"), file, "utf8");

  return NextResponse.json({ ok: true, slug, year });
}

type DeleteBody = {
  slug: string;
  year: string;
};

export async function DELETE(request: Request) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const slug = sanitizeSlug(body.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400 });
  }

  const year = body.year && /^\d{4}$/.test(body.year.trim()) ? body.year.trim() : new Date().getFullYear().toString();
  const postDir = path.join(blogsDir, year, slug);

  try {
    await fs.access(path.join(postDir, "index.md"));
  } catch {
    return NextResponse.json({ error: "Blog post not found." }, { status: 404 });
  }

  await fs.rm(postDir, { recursive: true, force: true });
  return NextResponse.json({ ok: true });
}
