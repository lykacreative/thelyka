import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const year = (formData.get("year") as string)?.trim();

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!year) {
      return NextResponse.json(
        { error: "Year is required." },
        { status: 400 }
      );
    }

    // Only allow images
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Convert uploaded file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Clean filename
    const originalName = file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    );

    const filename =
      originalName || `image-${Date.now()}.jpg`;

    // Target:
    // public/media/<year>/
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "media",
      year
    );

    // Automatically creates the year folder if it doesn't exist
    await mkdir(uploadDir, { recursive: true });

    // Full filesystem path
    const filePath = path.join(uploadDir, filename);

    // Save image
    await writeFile(filePath, buffer);

    // Public URL
    const publicUrl = `/media/${year}/${filename}`;

    return NextResponse.json({
      success: true,
      filename,
      year,
      src: publicUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}