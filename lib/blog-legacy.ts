import { readCloudinaryRaw, readCloudinaryRawStrict } from "@/lib/cloudinary";

// The OLD blog store (before the admin rebuild): a metadata JSON plus one Markdown file per post, kept as raw
// files in Cloudinary under thelyka/blogs/. Read only: posts are copied into MongoDB (lib/blog-store.ts) and
// these files are left in place as a backup.
export const LEGACY_BLOG_METADATA_ID = "thelyka/blogs/metadata";

function legacyMarkdownId(year: string, slug: string) {
  return `thelyka/blogs/${year}/${slug}/index`;
}

export type LegacyBlogPost = {
  slug: string;
  year: string;
  title: string;
  date: string;
  excerpt: string;
  cover: string;
  content: string;
};

type LegacyMetadata = { slug?: unknown; year?: unknown; title?: unknown; date?: unknown; excerpt?: unknown; cover?: unknown };

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {} as Record<string, string>, body: raw.trim() };
  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }
  return { frontmatter, body: match[2].trim() };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// strict = true (used when copying into MongoDB): any error other than "file not found" throws,
// so a timeout can never be taken for "there are no posts".
export async function readLegacyBlogPosts(strict: boolean): Promise<LegacyBlogPost[]> {
  const read = strict ? readCloudinaryRawStrict : readCloudinaryRaw;
  const metadataRaw = await read(LEGACY_BLOG_METADATA_ID);
  if (!metadataRaw) return [];

  let entries: LegacyMetadata[];
  try {
    const parsed = JSON.parse(metadataRaw) as unknown;
    entries = Array.isArray(parsed) ? (parsed as LegacyMetadata[]) : [];
  } catch (error) {
    if (strict) throw new Error("The old blog metadata file is not valid JSON.");
    console.error("Invalid legacy blog metadata JSON.", error);
    return [];
  }

  const posts = await Promise.all(
    entries.map(async (entry) => {
      const slug = text(entry.slug);
      const year = text(entry.year);
      if (!slug || !/^\d{4}$/.test(year)) return null;
      const raw = await read(legacyMarkdownId(year, slug));
      if (!raw) return null;
      const { frontmatter, body } = parseFrontmatter(raw);
      return {
        slug,
        year,
        title: text(entry.title) || frontmatter.title || slug,
        date: text(entry.date) || frontmatter.date || year,
        excerpt: text(entry.excerpt) || frontmatter.excerpt || "",
        cover: text(entry.cover) || frontmatter.cover || "",
        content: body
      } satisfies LegacyBlogPost;
    })
  );

  return posts.filter((post): post is LegacyBlogPost => post !== null);
}
