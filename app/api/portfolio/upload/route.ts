import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import path from "path";
import { isAdminAuthenticated } from "@/lib/admin-auth";
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
import {
  isCloudinaryConfigured,
  portfolioUsesCloudinary,
  uploadPortfolioImage,
} from "@/lib/cloudinary";
import {
  readPortfolioMetadata,
  writePortfolioMetadata,
  type PortfolioMetadataEntry,
} from "@/lib/portfolio-metadata";
import { writeFile, mkdir } from "fs/promises";

export const runtime = "nodejs";

function usesCloudStorage() {
  return (
    portfolioUsesCloudinary() ||
    (isCloudinaryConfigured() &&
      process.env.PORTFOLIO_STORAGE === "cloudinary")
  );
}

export async function POST(req: NextRequest) {
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

  if (!usesCloudStorage() && process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error:
          "Cloudinary is not configured for production uploads. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET on Vercel.",
      },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();

    /*
     * Backwards compatible upload handling:
     *
     * Single image:
     *   file
     *
     * Gallery:
     *   files
     *   files
     *   files
     *   ...
     *
     * The frontend can submit any number of `files`.
     */

    const galleryFiles = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    const singleFile = formData.get("file");

    const files: File[] =
      galleryFiles.length > 0
        ? galleryFiles
        : singleFile instanceof File
          ? [singleFile]
          : [];

    const title =
      (formData.get("title") as string)?.trim() || "";

    const category =
      (formData.get("category") as string)?.toLowerCase().trim();

    const year =
      (formData.get("year") as string)?.trim() ||
      new Date().getFullYear().toString();

    const date =
      (formData.get("date") as string)?.trim() || undefined;

    const note =
      (formData.get("note") as string)?.trim() || "";

    const artTypeInput =
      (formData.get("artType") as string)?.trim() ||
      defaultArtType;

    const artType = isArtType(artTypeInput)
      ? artTypeInput
      : defaultArtType;

    const reviewTypeInput =
      (formData.get("reviewType") as string)?.trim() ||
      defaultReviewType;

    const reviewType = isReviewType(reviewTypeInput)
      ? reviewTypeInput
      : defaultReviewType;

    /*
     * coverIndex is the index of the selected cover
     * inside the submitted files array.
     *
     * Example:
     * files[0] = image A
     * files[1] = image B
     * files[2] = image C
     *
     * coverIndex=1 means image B is the cover.
     */
    const coverIndexRaw =
      (formData.get("coverIndex") as string)?.trim() || "0";

    const parsedCoverIndex = Number.parseInt(
      coverIndexRaw,
      10
    );

    const coverIndex = Number.isInteger(parsedCoverIndex)
      ? parsedCoverIndex
      : 0;

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category is required." },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { error: "Title is required." },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(year)) {
      return NextResponse.json(
        { error: "Year must be a 4-digit number." },
        { status: 400 }
      );
    }

    if (
      coverIndex < 0 ||
      coverIndex >= files.length
    ) {
      return NextResponse.json(
        { error: "Invalid cover image selection." },
        { status: 400 }
      );
    }

    const isArts = category === "arts";
    const isReviews = category === "reviews";

    const artTypeFolder = isArts
      ? artSlugByType[artType]
      : "";

    const reviewTypeFolder = isReviews
      ? reviewSlugByType[reviewType]
      : "";

    const typeFolder =
      artTypeFolder || reviewTypeFolder;

    const uploadedImages: Array<{
      src: string;
      cloudinaryPublicId?: string;
      width?: number;
      height?: number;
    }> = [];

    /*
     * Upload every image.
     */
    for (let index = 0; index < files.length; index++) {
      const file = files[index];

      const ext =
        path.extname(file.name) || ".jpg";

      const safeName =
        `${Date.now()}-${index}-` +
        file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "-")
          .toLowerCase();

      const buffer = Buffer.from(
        await file.arrayBuffer()
      );

      let src: string;
      let cloudinaryPublicId: string | undefined;
      let width: number | undefined;
      let height: number | undefined;

      if (usesCloudStorage()) {
        const folder = [
          "thelyka",
          "portfolio",
          category,
          ...(typeFolder
            ? [typeFolder, year]
            : [year]),
        ].join("/");

        const uploaded =
          await uploadPortfolioImage(
            buffer,
            folder,
            safeName
          );

        src = uploaded.secureUrl;
        cloudinaryPublicId =
          uploaded.publicId;
        width = uploaded.width;
        height = uploaded.height;
      } else {
        const uploadDir = path.join(
          process.cwd(),
          "public",
          "portfolio",
          category,
          ...(typeFolder
            ? [typeFolder, year]
            : [year])
        );

        await mkdir(uploadDir, {
          recursive: true,
        });

        const filename =
          `${safeName}${ext}`;

        await writeFile(
          path.join(uploadDir, filename),
          buffer
        );

        src = typeFolder
          ? `/portfolio/${category}/${typeFolder}/${year}/${filename}`
          : `/portfolio/${category}/${year}/${filename}`;
      }

      uploadedImages.push({
        src,
        cloudinaryPublicId,
        width,
        height,
      });
    }

    /*
     * The selected cover becomes `src`.
     */
    const coverImage =
      uploadedImages[coverIndex];

    /*
     * Keep all images in `images`.
     *
     * For a single upload:
     *
     * images = [the uploaded image]
     *
     * For a gallery:
     *
     * images = [image1, image2, image3, ...]
     */
    const metadata = await readPortfolioMetadata();

    const entry: PortfolioMetadataEntry = {
      src: coverImage.src,

      cloudinaryPublicId:
        coverImage.cloudinaryPublicId,

      category,
      year,
      title,
      note,
      date,

      width: coverImage.width,
      height: coverImage.height,

      gallery: uploadedImages,

      coverIndex,

      ...(isArts
        ? { artType }
        : {}),

      ...(isReviews
        ? { reviewType }
        : {}),
    };

    /*
     * Replace an existing entry with the same cover URL.
     */
    const next = metadata.filter(
      (item) => item.src !== entry.src
    );

    next.push(entry);

    await writePortfolioMetadata(next);

    revalidateTag("portfolio", {
      expire: 0,
    });

    return NextResponse.json({
      success: true,

      /*
       * Cover image.
       */
      src: coverImage.src,

      /*
       * Complete gallery.
       */
      gallery: uploadedImages,

      coverIndex,

      message:
        uploadedImages.length > 1
          ? "Gallery uploaded successfully"
          : "Uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);

    return NextResponse.json(
      {
        error: "Upload failed",
      },
      { status: 500 }
    );
  }
}