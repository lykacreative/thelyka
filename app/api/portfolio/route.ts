import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { revalidateTag } from "next/cache";
import { isArtType } from "@/lib/art-types";
import { isReviewType } from "@/lib/review-types";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { deleteCloudinaryImage, isCloudinarySrc } from "@/lib/cloudinary";
import { categories, type Category } from "@/lib/portfolio";
import {
  isRemotePortfolioSrc,
  readPortfolioMetadata,
  writePortfolioMetadata,
  type PortfolioMetadataEntry,
} from "@/lib/portfolio-metadata";

export const runtime = "nodejs";

const portfolioDir = path.join(process.cwd(), "public", "portfolio");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

function isCategory(value: string): value is Category {
  return (categories as readonly string[]).includes(value);
}

function titleFromFilename(file: string) {
  return path
    .basename(file, path.extname(file))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isValidPortfolioSrc(src: string) {
  return src.startsWith("/portfolio/") || isRemotePortfolioSrc(src);
}

function parseLocalSrc(src: string) {
  if (!src.startsWith("/portfolio/")) return null;
  const relative = src.replace(/^\/portfolio\//, "");
  if (!relative || relative.includes("..")) return null;

  const segments = relative.split("/").filter(Boolean);
  if (segments.length < 3) return null;

  const category = segments[0];
  if (!isCategory(category)) return null;

  const yearIndex = segments.findIndex((s) => /^\d{4}$/.test(s));
  if (yearIndex === -1) return null;

  const year = segments[yearIndex];
  const tail = segments.slice(yearIndex + 1).join("/");
  const filename = tail.split("/").pop() || "";
  if (!filename || filename.includes("..")) return null;

  return { category: category as Category, year, filename, relative };
}

function resolveFilePath(src: string) {
  const parsed = parseLocalSrc(src);
  if (!parsed) return null;
  const absolute = path.join(portfolioDir, parsed.relative);
  const resolved = path.resolve(absolute);
  if (!resolved.startsWith(path.resolve(portfolioDir))) return null;
  return resolved;
}

async function fileExists(filepath: string) {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

function sanitizeTitle(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").trim();
}

function sanitizeNote(value: string) {
  return value.replace(/[\r\t]+/g, " ").trim();
}

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const metadata = await readPortfolioMetadata();
  return NextResponse.json({ metadata });
}

type UpdateBody = {
  src: string;
  title?: string;
  date?: string;
  note?: string;
  category?: string;
  year?: string;
  artType?: string;
  reviewType?: string;
};

export async function PATCH(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.src || !isValidPortfolioSrc(body.src)) {
    return NextResponse.json({ error: "Invalid src." }, { status: 400 });
  }

  const parsed = parseLocalSrc(body.src);
  const isRemote = isRemotePortfolioSrc(body.src);

  if (!isRemote) {
    if (!parsed) {
      return NextResponse.json(
        { error: "src must look like /portfolio/<category>/<year>/<filename>." },
        { status: 400 }
      );
    }

    const filepath = resolveFilePath(body.src);
    if (!filepath || !(await fileExists(filepath))) {
      return NextResponse.json(
        { error: "No file exists at that path. Drop the image into public/portfolio first." },
        { status: 404 }
      );
    }
  }

  const metadata = await readPortfolioMetadata();
  let index = metadata.findIndex((entry) => entry.src === body.src);
  let current: PortfolioMetadataEntry;

  if (index === -1) {
    if (!parsed) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    current = {
      src: body.src,
      category: parsed.category,
      year: parsed.year,
      title: titleFromFilename(parsed.filename),
    };
    metadata.push(current);
    index = metadata.length - 1;
  } else {
    current = metadata[index];
  }

  const next: PortfolioMetadataEntry = { ...current, src: body.src };

  if (typeof body.title === "string") next.title = sanitizeTitle(body.title);
  if (typeof body.note === "string") next.note = sanitizeNote(body.note);
  if (typeof body.date === "string") next.date = body.date.trim() || undefined;
  if (typeof body.year === "string") {
    if (!/^\d{4}$/.test(body.year.trim())) {
      return NextResponse.json({ error: "Year must be a 4-digit number." }, { status: 400 });
    }
    next.year = body.year.trim();
  }
  if (typeof body.category === "string") {
    if (!isCategory(body.category)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
    next.category = body.category;
  }
  if (typeof body.artType === "string") {
    if (!isArtType(body.artType)) {
      return NextResponse.json({ error: "Invalid art type." }, { status: 400 });
    }
    next.artType = body.artType;
  }
  if (typeof body.reviewType === "string") {
    if (!isReviewType(body.reviewType)) {
      return NextResponse.json({ error: "Invalid review type." }, { status: 400 });
    }
    next.reviewType = body.reviewType;
  }

  metadata[index] = next;

  console.log("PORTFOLIO PATCH: before write", {
    body,
    current,
    next,
    metadataCount: metadata.length,
  });

  await writePortfolioMetadata(metadata);

  console.log("PORTFOLIO PATCH: metadata written");

  revalidateTag("portfolio", "max");

  console.log("PORTFOLIO PATCH: complete");

  return NextResponse.json({ ok: true, entry: next });
}

type DeleteBody = {
  src: string;
  deleteFile?: boolean;
};

export async function DELETE(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: DeleteBody;
  try {
    body = (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.src || !isValidPortfolioSrc(body.src)) {
    return NextResponse.json({ error: "Invalid src." }, { status: 400 });
  }

  const metadata = await readPortfolioMetadata();
  const existing = metadata.find((entry) => entry.src === body.src);
  const before = metadata.length;
  const next = metadata.filter((entry) => entry.src !== body.src);
  const hadMetadata = next.length < before;

  if (hadMetadata) {
    await writePortfolioMetadata(next);
    revalidateTag("portfolio", "max");
  }

  let fileDeleted = false;
  if (body.deleteFile) {
    if (existing?.cloudinaryPublicId && isCloudinarySrc(body.src)) {
      try {
        await deleteCloudinaryImage(existing.cloudinaryPublicId);
        fileDeleted = true;
      } catch {
        // Image may already be gone; ignore.
      }
    } else {
      const filepath = resolveFilePath(body.src);
      if (filepath) {
        const ext = path.extname(filepath).toLowerCase();
        if (imageExtensions.has(ext)) {
          try {
            await fs.unlink(filepath);
            fileDeleted = true;
          } catch {
            // File may already be gone; ignore.
          }
        }
      }
    }
  }

  if (!hadMetadata && !fileDeleted) {
    return NextResponse.json(
      { error: "Item not found in metadata and no file was deleted." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true, fileDeleted, metadataRemoved: hadMetadata });
}
