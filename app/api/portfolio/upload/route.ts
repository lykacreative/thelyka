
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  defaultArtType,
  isArtType,
} from "@/lib/art-types";
import {
  defaultReviewType,
  isReviewType,
} from "@/lib/review-types";
import {
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { connectToDatabase } from "@/lib/mongodb";
import {
  PORTFOLIO_COLLECTION,
  type PortfolioItemDoc,
} from "@/lib/portfolio-collection";

export const runtime = "nodejs";

function isCloudStorageConfigured() {
  return (
    isCloudinaryConfigured() &&
    process.env.PORTFOLIO_STORAGE === "cloudinary"
  );
}

type GalleryImagePayload = {
  src: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
};

type UploadPayload = {
  title?: unknown;
  category?: unknown;
  year?: unknown;
  date?: unknown;
  note?: unknown;
  artType?: unknown;
  reviewType?: unknown;
  src?: unknown;
  cloudinaryPublicId?: unknown;
  width?: unknown;
  height?: unknown;
  gallery?: unknown;
  coverIndex?: unknown;
};

function parseGallery(
  value: unknown
): GalleryImagePayload[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const images: GalleryImagePayload[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const image = item as Record<string, unknown>;

    if (
      typeof image.src !== "string" ||
      !image.src.trim()
    ) {
      return null;
    }

    try {
      const url = new URL(image.src);

      if (
        url.hostname !== "res.cloudinary.com"
      ) {
        return null;
      }
    } catch {
      return null;
    }

    images.push({
      src: image.src.trim(),

      ...(typeof image.cloudinaryPublicId === "string" &&
      image.cloudinaryPublicId.trim()
        ? {
            cloudinaryPublicId:
              image.cloudinaryPublicId.trim(),
          }
        : {}),

      ...(typeof image.width === "number" &&
      Number.isFinite(image.width)
        ? {
            width: image.width,
          }
        : {}),

      ...(typeof image.height === "number" &&
      Number.isFinite(image.height)
        ? {
            height: image.height,
          }
        : {}),
    });
  }

  return images;
}

export async function POST(
  req: NextRequest
) {
  // ------------------------------------------------------------
  // Authentication
  // ------------------------------------------------------------

  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        {
          error: "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }
  } catch {
    return NextResponse.json(
      {
        error: "Not authenticated.",
      },
      {
        status: 401,
      }
    );
  }

  // ------------------------------------------------------------
  // Cloudinary is required
  // ------------------------------------------------------------

  if (!isCloudStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Cloudinary is required for portfolio uploads. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, and PORTFOLIO_STORAGE=cloudinary.",
      },
      {
        status: 500,
      }
    );
  }

  // ------------------------------------------------------------
  // Parse JSON
  // ------------------------------------------------------------

  let body: UploadPayload;

  try {
    body = (await req.json()) as UploadPayload;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON request body.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Metadata
  // ------------------------------------------------------------

  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  const category =
    typeof body.category === "string"
      ? body.category.toLowerCase().trim()
      : "";

  const year =
    typeof body.year === "string" &&
    body.year.trim()
      ? body.year.trim()
      : new Date()
          .getFullYear()
          .toString();

  const date =
    typeof body.date === "string"
      ? body.date.trim() || undefined
      : undefined;

  const note =
    typeof body.note === "string"
      ? body.note.trim()
      : "";

  // ------------------------------------------------------------
  // Art type
  // ------------------------------------------------------------

  const artTypeInput =
    typeof body.artType === "string" &&
    body.artType.trim()
      ? body.artType.trim()
      : defaultArtType;

  const artType = isArtType(artTypeInput)
    ? artTypeInput
    : defaultArtType;

  // ------------------------------------------------------------
  // Review type
  // ------------------------------------------------------------

  const reviewTypeInput =
    typeof body.reviewType === "string" &&
    body.reviewType.trim()
      ? body.reviewType.trim()
      : defaultReviewType;

  const reviewType = isReviewType(
    reviewTypeInput
  )
    ? reviewTypeInput
    : defaultReviewType;

  // ------------------------------------------------------------
  // Basic validation
  // ------------------------------------------------------------

  if (!title) {
    return NextResponse.json(
      {
        error: "Title is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (!category) {
    return NextResponse.json(
      {
        error: "Category is required.",
      },
      {
        status: 400,
      }
    );
  }

  if (!/^\d{4}$/.test(year)) {
    return NextResponse.json(
      {
        error: "Year must be a 4-digit number.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Gallery
  //
  // Images have already been uploaded directly to Cloudinary
  // by the browser.
  // ------------------------------------------------------------

  const gallery = parseGallery(body.gallery);

  if (!gallery) {
    return NextResponse.json(
      {
        error: "Invalid gallery data.",
      },
      {
        status: 400,
      }
    );
  }

  if (gallery.length === 0) {
    return NextResponse.json(
      {
        error:
          "At least one Cloudinary image is required.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Validate Cloudinary metadata
  // ------------------------------------------------------------

  for (const image of gallery) {
    if (
      !image.cloudinaryPublicId ||
      !image.cloudinaryPublicId.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Every portfolio image must include a Cloudinary public ID.",
        },
        {
          status: 400,
        }
      );
    }
  }

  // ------------------------------------------------------------
  // Cover index
  // ------------------------------------------------------------

  const coverIndex =
    typeof body.coverIndex === "number"
      ? body.coverIndex
      : typeof body.coverIndex === "string"
        ? Number.parseInt(
            body.coverIndex,
            10
          )
        : 0;

  if (
    !Number.isInteger(coverIndex) ||
    coverIndex < 0 ||
    coverIndex >= gallery.length
  ) {
    return NextResponse.json(
      {
        error:
          "Invalid cover image selection.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Selected cover
  // ------------------------------------------------------------

  const coverImage = gallery[coverIndex];

  if (!coverImage) {
    return NextResponse.json(
      {
        error:
          "Selected cover image was not found.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Verify src matches selected cover
  // ------------------------------------------------------------

  if (
    typeof body.src === "string" &&
    body.src.trim() &&
    body.src.trim() !== coverImage.src
  ) {
    return NextResponse.json(
      {
        error:
          "The supplied cover image does not match the selected gallery image.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Category-specific metadata
  // ------------------------------------------------------------

  const isArts = category === "arts";
  const isReviews = category === "reviews";

  // ------------------------------------------------------------
  // Build MongoDB document
  // ------------------------------------------------------------

  const now = new Date();

  const doc: PortfolioItemDoc = {
    src: coverImage.src,

    cloudinaryPublicId:
      coverImage.cloudinaryPublicId,

    category,

    year,

    title,

    note: note || null,

    date: date ?? null,

    width: coverImage.width,

    height: coverImage.height,

    gallery,

    coverIndex,

    ...(isArts
      ? {
          artType,
        }
      : {}),

    ...(isReviews
      ? {
          reviewType,
        }
      : {}),

    createdAt: now,

    updatedAt: now,
  };

  // ------------------------------------------------------------
  // Save metadata to MongoDB
  // ------------------------------------------------------------

  const { db } =
    await connectToDatabase();

  const collection = db.collection(
  PORTFOLIO_COLLECTION
);

  const result =
    await collection.insertOne(
      doc as any
    );

  // ------------------------------------------------------------
  // Revalidate portfolio cache
  // ------------------------------------------------------------

  revalidateTag("portfolio", {
    expire: 0,
  });

  // ------------------------------------------------------------
  // Response
  // ------------------------------------------------------------

  const entry = {
    ...doc,
    _id: result.insertedId.toString(),
  };

  return NextResponse.json({
    ok: true,
    entry,
  });
}

