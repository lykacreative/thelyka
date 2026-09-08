
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isArtType } from "@/lib/art-types";
import { isReviewType } from "@/lib/review-types";
import { isAdminAuthenticated } from "@/lib/admin-auth";

import {
  deleteCloudinaryImage,
  isCloudinarySrc,
} from "@/lib/cloudinary";

import {
  categories,
  type Category,
} from "@/lib/portfolio";

import { connectToDatabase } from "@/lib/mongodb";

import {
  PORTFOLIO_COLLECTION,
  type PortfolioItemDoc,
} from "@/lib/portfolio-collection";

export const runtime = "nodejs";

// ============================================================
// Helpers
// ============================================================

function isCategory(value: string): value is Category {
  return (categories as readonly string[]).includes(value);
}

function isRemotePortfolioSrc(src: string) {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://")
  );
}

function isValidPortfolioSrc(src: string) {
  return (
    src.startsWith("/portfolio/") ||
    isRemotePortfolioSrc(src)
  );
}

function sanitizeTitle(value: string) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .trim();
}

function sanitizeNote(value: string) {
  return value
    .replace(/[\r\t]+/g, " ")
    .trim();
}

// ============================================================
// GET
// ============================================================

export async function GET() {
  // ----------------------------------------------------------
  // Authentication
  // ----------------------------------------------------------

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

  try {
    // --------------------------------------------------------
    // MongoDB
    // --------------------------------------------------------

    const { db } =
      await connectToDatabase();

    const collection = db.collection(
  PORTFOLIO_COLLECTION
);

    const items = await collection
      .find({})
      .sort({
        year: -1,
        date: -1,
      })
      .toArray();

    // --------------------------------------------------------
    // Convert ObjectId for frontend
    // --------------------------------------------------------

    const cleaned = items.map(
      (item: PortfolioItemDoc) => ({
        ...item,
        _id: item._id?.toString(),
      })
    );

    return NextResponse.json({
      items: cleaned,
    });
  } catch (error) {
    console.error(
      "PORTFOLIO GET ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load portfolio items.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// PATCH
// ============================================================

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

export async function PATCH(
  request: Request
) {
  // ----------------------------------------------------------
  // Authentication
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Parse JSON
  // ----------------------------------------------------------

  let body: UpdateBody;

  try {
    body =
      (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
      },
      {
        status: 400,
      }
    );
  }

  // ----------------------------------------------------------
  // Validate src
  // ----------------------------------------------------------

  if (
    !body.src ||
    !isValidPortfolioSrc(body.src)
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

  try {
    // --------------------------------------------------------
    // MongoDB
    // --------------------------------------------------------

    const { db } =
      await connectToDatabase();

    const collection = db.collection(
  PORTFOLIO_COLLECTION
);

    const current =
      await collection.findOne({
        src: body.src,
      });

    if (!current) {
      return NextResponse.json(
        {
          error: "Item not found.",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // Build updated document
    // --------------------------------------------------------

    const next: PortfolioItemDoc = {
      ...current,
      updatedAt: new Date(),
    };

    if (
      typeof body.title === "string"
    ) {
      next.title =
        sanitizeTitle(body.title);
    }

    if (
      typeof body.note === "string"
    ) {
      next.note =
        sanitizeNote(body.note);
    }

    if (
      typeof body.date === "string"
    ) {
      next.date =
        body.date.trim() || null;
    }

    // --------------------------------------------------------
    // Year
    // --------------------------------------------------------

    if (
      typeof body.year === "string"
    ) {
      const year =
        body.year.trim();

      if (!/^\d{4}$/.test(year)) {
        return NextResponse.json(
          {
            error:
              "Year must be a 4-digit number.",
          },
          {
            status: 400,
          }
        );
      }

      next.year = year;
    }

    // --------------------------------------------------------
    // Category
    // --------------------------------------------------------

    if (
      typeof body.category === "string"
    ) {
      const category =
        body.category.trim();

      if (!isCategory(category)) {
        return NextResponse.json(
          {
            error: "Invalid category.",
          },
          {
            status: 400,
          }
        );
      }

      next.category = category;
    }

    // --------------------------------------------------------
    // Art type
    // --------------------------------------------------------

    if (
      typeof body.artType === "string"
    ) {
      const artType =
        body.artType.trim();

      if (!isArtType(artType)) {
        return NextResponse.json(
          {
            error: "Invalid art type.",
          },
          {
            status: 400,
          }
        );
      }

      next.artType = artType;
    }

    // --------------------------------------------------------
    // Review type
    // --------------------------------------------------------

    if (
      typeof body.reviewType === "string"
    ) {
      const reviewType =
        body.reviewType.trim();

      if (!isReviewType(reviewType)) {
        return NextResponse.json(
          {
            error: "Invalid review type.",
          },
          {
            status: 400,
          }
        );
      }

      next.reviewType =
        reviewType;
    }

    // --------------------------------------------------------
    // Update MongoDB
    // --------------------------------------------------------

    await collection.updateOne(
      {
        _id: current._id,
      },
      {
        $set: next,
      }
    );

    // --------------------------------------------------------
    // Revalidate cache
    // --------------------------------------------------------

    revalidateTag(
      "portfolio",
      {
        expire: 0,
      }
    );

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------

    const entry = {
      ...next,
      _id: next._id?.toString(),
    };

    return NextResponse.json({
      ok: true,
      entry,
    });
  } catch (error) {
    console.error(
      "PORTFOLIO PATCH ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to update portfolio item.",
      },
      {
        status: 500,
      }
    );
  }
}

// ============================================================
// DELETE
// ============================================================

type DeleteBody = {
  src: string;

  // Kept for frontend compatibility.
  // When true, the Cloudinary image is deleted too.
  deleteFile?: boolean;
};

export async function DELETE(
  request: Request
) {
  // ----------------------------------------------------------
  // Authentication
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Parse JSON
  // ----------------------------------------------------------

  let body: DeleteBody;

  try {
    body =
      (await request.json()) as DeleteBody;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
      },
      {
        status: 400,
      }
    );
  }

  // ----------------------------------------------------------
  // Validate src
  // ----------------------------------------------------------

  if (
    !body.src ||
    !isValidPortfolioSrc(body.src)
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

  try {
    // --------------------------------------------------------
    // MongoDB
    // --------------------------------------------------------

    const { db } =
      await connectToDatabase();

    const collection = db.collection(
  PORTFOLIO_COLLECTION
);

    const existing =
      await collection.findOne({
        src: body.src,
      });

    if (!existing) {
      return NextResponse.json(
        {
          error:
            "Item not found in database.",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------------
    // Delete Cloudinary image
    // --------------------------------------------------------

    let fileDeleted = false;

    if (
      body.deleteFile &&
      existing.cloudinaryPublicId &&
      isCloudinarySrc(body.src)
    ) {
      try {
        await deleteCloudinaryImage(
          existing.cloudinaryPublicId
        );

        fileDeleted = true;
      } catch (error) {
        console.error(
          "PORTFOLIO DELETE: failed to delete Cloudinary image",
          existing.cloudinaryPublicId,
          error
        );

        // Continue deleting MongoDB metadata.
        // The Cloudinary asset may already be gone.
      }
    }

    // --------------------------------------------------------
    // Delete MongoDB metadata
    // --------------------------------------------------------

    await collection.deleteOne({
      _id: existing._id,
    });

    // --------------------------------------------------------
    // Revalidate cache
    // --------------------------------------------------------

    revalidateTag(
      "portfolio",
      {
        expire: 0,
      }
    );

    return NextResponse.json({
      ok: true,
      fileDeleted,
      metadataRemoved: true,
    });
  } catch (error) {
    console.error(
      "PORTFOLIO DELETE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to delete portfolio item.",
      },
      {
        status: 500,
      }
    );
  }
}
