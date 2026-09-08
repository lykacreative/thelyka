
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createCloudinaryUploadSignature } from "@/lib/cloudinary";

export const runtime = "nodejs";

function sanitizePublicId(value: string) {
  return value
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 150);
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "Not authenticated." },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Not authenticated." },
      { status: 401 }
    );
  }

  let body: {
    folder?: unknown;
    publicId?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const folder =
    typeof body.folder === "string"
      ? body.folder.trim()
      : "";

  const publicId =
    typeof body.publicId === "string"
      ? sanitizePublicId(body.publicId)
      : "";

  if (!folder) {
    return NextResponse.json(
      { error: "Missing folder." },
      { status: 400 }
    );
  }

  if (!folder.startsWith("thelyka/portfolio/")) {
    return NextResponse.json(
      { error: "Invalid Cloudinary folder." },
      { status: 400 }
    );
  }

  if (folder.includes("..")) {
    return NextResponse.json(
      { error: "Invalid Cloudinary folder." },
      { status: 400 }
    );
  }

  if (!publicId) {
    return NextResponse.json(
      { error: "Missing public ID." },
      { status: 400 }
    );
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;

  if (!cloudName || !apiKey) {
    return NextResponse.json(
      { error: "Cloudinary is not configured." },
      { status: 500 }
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);

  try {
    const signature = createCloudinaryUploadSignature({
      folder,
      public_id: publicId,
      timestamp,
    });

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId,
    });
  } catch (error) {
    console.error(
      "PORTFOLIO UPLOAD SIGNATURE: failed",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create Cloudinary upload signature.",
      },
      { status: 500 }
    );
  }
}
