
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  deleteCloudinaryImage,
  isCloudinarySrc,
} from "@/lib/cloudinary";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { categories, type Category } from "@/lib/portfolio";
import { isArtType } from "@/lib/art-types";
import { isReviewType } from "@/lib/review-types";
import { connectToDatabase } from "@/lib/mongodb";
import {
  PORTFOLIO_COLLECTION,
  type PortfolioItemDoc,
} from "@/lib/portfolio-collection";

export const runtime = "nodejs";

function isCategory(value: string): value is Category {
  return (categories as readonly string[]).includes(value);
}

function sanitizeTitle(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").trim();
}

function sanitizeNote(value: string) {
  return value.replace(/[\r\t]+/g, " ").trim();
}

function isRemotePortfolioSrc(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}

function isValidPortfolioSrc(src: string) {
  return (
    isCloudinarySrc(src) ||
    src.startsWith("/portfolio/") ||
    isRemotePortfolioSrc(src)
  );
}

type GalleryImage = {
  src: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
};

function parseGallery(value: unknown): GalleryImage[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const images: GalleryImage[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const image = item as Record<string, unknown>;

    if (
      typeof image.src !== "string" ||
      !isValidPortfolioSrc(image.src)
    ) {
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

function isCloudinaryGalleryImage(image: GalleryImage) {
  return (
    isCloudinarySrc(image.src) &&
    typeof image.cloudinaryPublicId === "string" &&
    image.cloudinaryPublicId.trim().length > 0
  );
}

export async function POST(request: Request) {
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
  // Parse JSON
  // ------------------------------------------------------------

  let body: Record<string, unknown>;

  try {
    body = await request.json();
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

  const srcValue = body.src;
  const titleValue = body.title;
  const dateValue = body.date;
  const noteValue = body.note;
  const categoryValue = body.category;
  const yearValue = body.year;
  const artTypeValue = body.artType;
  const reviewTypeValue = body.reviewType;
  const coverIndexValue = body.coverIndex;

  const retainedValue = body.retained;
  const newImagesValue = body.newImages;

  // ------------------------------------------------------------
  // Validate src
  // ------------------------------------------------------------

  if (
    typeof srcValue !== "string" ||
    !isValidPortfolioSrc(srcValue)
  ) {
    return NextResponse.json(
      {
        error: "Invalid src.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Parse gallery
  // ------------------------------------------------------------

  const retained = parseGallery(retainedValue);
  const newImages = parseGallery(newImagesValue);

  if (!retained) {
    return NextResponse.json(
      {
        error: "Invalid retained gallery data.",
      },
      {
        status: 400,
      }
    );
  }

  if (!newImages) {
    return NextResponse.json(
      {
        error: "Invalid new gallery data.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Combine existing + newly uploaded Cloudinary images
  // ------------------------------------------------------------

  const uploadedImages: GalleryImage[] = [
    ...retained,
    ...newImages,
  ];

  if (uploadedImages.length === 0) {
    return NextResponse.json(
      {
        error: "Gallery must contain at least one image.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Ensure every gallery image is stored on Cloudinary
  // ------------------------------------------------------------

  for (const image of uploadedImages) {
    if (!isCloudinaryGalleryImage(image)) {
      return NextResponse.json(
        {
          error:
            "All portfolio gallery images must be stored on Cloudinary.",
        },
        {
          status: 400,
        }
      );
    }
  }

  // ------------------------------------------------------------
  // Validate cover index
  // ------------------------------------------------------------

  const coverIndex =
    typeof coverIndexValue === "number"
      ? coverIndexValue
      : Number.parseInt(
          typeof coverIndexValue === "string"
            ? coverIndexValue
            : "0",
          10
        );

  if (
    !Number.isInteger(coverIndex) ||
    coverIndex < 0 ||
    coverIndex >= uploadedImages.length
  ) {
    return NextResponse.json(
      {
        error: "Invalid cover index.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Validate year
  // ------------------------------------------------------------

  if (
    typeof yearValue === "string" &&
    yearValue.trim() &&
    !/^\d{4}$/.test(yearValue.trim())
  ) {
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
  // Validate category
  // ------------------------------------------------------------

  if (
    typeof categoryValue === "string" &&
    categoryValue.trim() &&
    !isCategory(categoryValue.trim())
  ) {
    return NextResponse.json(
      {
        error: "Invalid category.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Validate art type
  // ------------------------------------------------------------

  if (
    typeof artTypeValue === "string" &&
    artTypeValue.trim() &&
    !isArtType(artTypeValue.trim())
  ) {
    return NextResponse.json(
      {
        error: "Invalid art type.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Validate review type
  // ------------------------------------------------------------

  if (
    typeof reviewTypeValue === "string" &&
    reviewTypeValue.trim() &&
    !isReviewType(reviewTypeValue.trim())
  ) {
    return NextResponse.json(
      {
        error: "Invalid review type.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // MongoDB
  // ------------------------------------------------------------

  const { db } = await connectToDatabase();

  const collection = db.collection(
  PORTFOLIO_COLLECTION
);

  // ------------------------------------------------------------
  // Find existing portfolio item
  // ------------------------------------------------------------

  const currentDoc = await collection.findOne({
    src: srcValue,
  });

  if (!currentDoc) {
    return NextResponse.json(
      {
        error: "Gallery item not found.",
      },
      {
        status: 404,
      }
    );
  }

  // ------------------------------------------------------------
  // Ensure existing item is actually a gallery
  // ------------------------------------------------------------

  const currentGallery = currentDoc.gallery ?? [];

  if (currentGallery.length < 2) {
    return NextResponse.json(
      {
        error: "The selected portfolio item is not a gallery.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Selected cover
  // ------------------------------------------------------------

  const coverImage = uploadedImages[coverIndex];

  if (!coverImage) {
    return NextResponse.json(
      {
        error: "Selected cover image was not found.",
      },
      {
        status: 400,
      }
    );
  }

  // ------------------------------------------------------------
  // Build updated MongoDB document
  // ------------------------------------------------------------

  const next: PortfolioItemDoc = {
    ...currentDoc,

    // Selected cover remains the main/legacy src.
    src: coverImage.src,

    // Complete gallery.
    gallery: uploadedImages,

    // Selected cover index.
    coverIndex,

    ...(typeof titleValue === "string"
      ? {
          title: sanitizeTitle(titleValue),
        }
      : {}),

    ...(typeof noteValue === "string"
      ? {
          note: sanitizeNote(noteValue),
        }
      : {}),

    ...(typeof dateValue === "string"
      ? {
          date: dateValue.trim() || null,
        }
      : {}),

    ...(typeof yearValue === "string" &&
    yearValue.trim()
      ? {
          year: yearValue.trim(),
        }
      : {}),

    ...(typeof categoryValue === "string" &&
    categoryValue.trim()
      ? {
          category: categoryValue.trim() as Category,
        }
      : {}),

    // Dimensions of selected cover.
    width: coverImage.width,
    height: coverImage.height,

    updatedAt: new Date(),
  };

  // ------------------------------------------------------------
  // Optional art type
  // ------------------------------------------------------------

  if (
    typeof artTypeValue === "string" &&
    artTypeValue.trim()
  ) {
    next.artType = artTypeValue.trim();
  }

  // ------------------------------------------------------------
  // Optional review type
  // ------------------------------------------------------------

  if (
    typeof reviewTypeValue === "string" &&
    reviewTypeValue.trim()
  ) {
    next.reviewType = reviewTypeValue.trim();
  }

  // ------------------------------------------------------------
  // Update MongoDB
  // ------------------------------------------------------------

  await collection.updateOne(
    {
      _id: currentDoc._id,
    },
    {
      $set: next,
    }
  );

  // ------------------------------------------------------------
  // Delete removed Cloudinary images
  // ------------------------------------------------------------

  const retainedCloudinaryIds = new Set(
    uploadedImages
      .map((image) => image.cloudinaryPublicId)
      .filter(
        (value): value is string =>
          typeof value === "string" &&
          value.trim().length > 0
      )
  );

  for (const oldImage of currentGallery) {
    if (
      oldImage.cloudinaryPublicId &&
      isCloudinarySrc(oldImage.src) &&
      !retainedCloudinaryIds.has(
        oldImage.cloudinaryPublicId
      )
    ) {
      try {
        await deleteCloudinaryImage(
          oldImage.cloudinaryPublicId
        );
      } catch (error) {
        console.error(
          "PORTFOLIO GALLERY: failed to delete removed image",
          oldImage.cloudinaryPublicId,
          error
        );
      }
    }
  }

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
    ...next,
    _id: next._id?.toString(),
  };

  return NextResponse.json({
    ok: true,
    entry,
  });
}

