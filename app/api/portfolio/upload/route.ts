import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import {
  artSlugByType,
  defaultArtType,
  isArtType,
} from "@/lib/art-types";
import {
  defaultReviewType,
  isReviewType,
  reviewSlugByType,
} from "@/lib/review-types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string)?.trim() || "";
    const category = (formData.get("category") as string)?.toLowerCase().trim();
    const year = (formData.get("year") as string)?.trim() || new Date().getFullYear().toString();
    const date = (formData.get("date") as string)?.trim() || undefined;
    const note = (formData.get("note") as string)?.trim() || "";
    const artTypeInput = (formData.get("artType") as string)?.trim() || defaultArtType;
    const artType = isArtType(artTypeInput) ? artTypeInput : defaultArtType;
    const reviewTypeInput = (formData.get("reviewType") as string)?.trim() || defaultReviewType;
    const reviewType = isReviewType(reviewTypeInput) ? reviewTypeInput : defaultReviewType;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json({ error: "Year must be a 4-digit number." }, { status: 400 });
    }

    const isArts = category === "arts";
    const isReviews = category === "reviews";

    // Arts and Reviews are stored like: public/portfolio/<category>/<type>/<year>/…
    // Everything else stays as:  public/portfolio/<category>/<year>/…
    const artTypeFolder = isArts ? artSlugByType[artType] : "";
    const reviewTypeFolder = isReviews ? reviewSlugByType[reviewType] : "";
    const typeFolder = artTypeFolder || reviewTypeFolder;

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "portfolio",
      category,
      ...(typeFolder ? [typeFolder, year] : [year])
    );

    // Automatically creates the year folder (and art-type folder) if it doesn't exist
    await mkdir(uploadDir, { recursive: true });

    // Safe filename
    const ext = path.extname(file.name) || ".jpg";
    const safeName =
      `${Date.now()}-` +
      file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .toLowerCase() +
      ext;

    const filePath = path.join(uploadDir, safeName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    const src = typeFolder
      ? `/portfolio/${category}/${typeFolder}/${year}/${safeName}`
      : `/portfolio/${category}/${year}/${safeName}`;

    // Also update metadata.json (optional but recommended)
    const metadataPath = path.join(process.cwd(), "public", "portfolio", "metadata.json");
    let metadata: any[] = [];

    if (existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(await readFile(metadataPath, "utf8"));
      } catch {
        metadata = [];
      }
    }

    metadata = metadata.filter((item) => item.src !== src);
    metadata.push({
      src,
      category,
      year,
      title,
      note,
      date: date || undefined,
      ...(isArts ? { artType } : {}),
      ...(isReviews ? { reviewType } : {}),
    });

    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      src,
      message: "Uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}