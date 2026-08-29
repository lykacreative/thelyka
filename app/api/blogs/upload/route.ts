import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  isCloudinaryConfigured,
  uploadBlogImage,
} from "@/lib/cloudinary";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const runtime = "nodejs";

function useCloudinary() {
  return (
    process.env.NODE_ENV === "production" &&
    isCloudinaryConfigured()
  );
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const year = (formData.get("year") as string)?.trim();

    if (!file) {
      return NextResponse.json(
        { error: "No file provided." },
        { status: 400 }
      );
    }

    if (!year || !/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { error: "A valid year is required." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const originalName = file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    );

    const filename =
      originalName || `image-${Date.now()}.jpg`;

    /*
     * Production:
     * Upload blog image to Cloudinary.
     */
    if (useCloudinary()) {
      const result = await uploadBlogImage(
        buffer,
        year,
        filename
      );

      return NextResponse.json({
        success: true,
        filename,
        year,
        src: result.secureUrl,
        publicId: result.publicId,
        storage: "cloudinary",
      });
    }

    /*
     * Local development:
     * Continue storing images in public/media.
     */
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "media",
      year
    );

    await mkdir(uploadDir, {
      recursive: true,
    });

    const filePath = path.join(
      uploadDir,
      filename
    );

    await writeFile(filePath, buffer);

    const publicUrl = `/media/${year}/${filename}`;

    return NextResponse.json({
      success: true,
      filename,
      year,
      src: publicUrl,
      storage: "local",
    });
  } catch (error) {
    console.error("Blog image upload error:", error);

    return NextResponse.json(
      { error: "Failed to upload image." },
      { status: 500 }
    );
  }
}