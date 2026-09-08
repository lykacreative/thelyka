import { NextRequest, NextResponse } from "next/server";
import {
  isCloudinaryConfigured,
  uploadBlogImage,
  deleteCloudinaryImage,
} from "@/lib/cloudinary";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
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
  } catch (error) {
    console.error("Blog image upload error:", error);

    return NextResponse.json(
      { error: "Failed to upload image." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
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
    const body = (await req.json()) as {
      publicId?: unknown;
    };

    const publicId =
      typeof body.publicId === "string"
        ? body.publicId.trim()
        : "";

    if (!publicId) {
      return NextResponse.json(
        { error: "Missing Cloudinary public ID." },
        { status: 400 }
      );
    }

    // Only allow deletion of blog images.
    if (!publicId.startsWith("thelyka/blog-media/")) {
      return NextResponse.json(
        { error: "Invalid Cloudinary image." },
        { status: 400 }
      );
    }

    await deleteCloudinaryImage(publicId);

    return NextResponse.json({
      success: true,
      publicId,
    });
  } catch (error) {
    console.error("BLOG IMAGE DELETE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete image.",
      },
      { status: 500 }
    );
  }
}