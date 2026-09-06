import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  deleteCloudinaryImage,
  isCloudinarySrc,
  uploadPortfolioImage,
} from "@/lib/cloudinary";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  isRemotePortfolioSrc,
  readPortfolioMetadata,
  writePortfolioMetadata,
  type PortfolioGalleryImage,
  type PortfolioMetadataEntry,
} from "@/lib/portfolio-metadata";
import { categories, type Category } from "@/lib/portfolio";
import { isArtType } from "@/lib/art-types";
import { isReviewType } from "@/lib/review-types";

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

function isValidPortfolioSrc(src: string) {
  return src.startsWith("/portfolio/") || isRemotePortfolioSrc(src);
}

type RetainedGalleryImage = {
  src: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
};

function parseRetainedGallery(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return null;

    const images: RetainedGalleryImage[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        return null;
      }

      if (typeof item.src !== "string" || !isValidPortfolioSrc(item.src)) {
        return null;
      }

      images.push({
        src: item.src,
        ...(typeof item.cloudinaryPublicId === "string"
          ? { cloudinaryPublicId: item.cloudinaryPublicId }
          : {}),
        ...(typeof item.width === "number"
          ? { width: item.width }
          : {}),
        ...(typeof item.height === "number"
          ? { height: item.height }
          : {}),
      });
    }

    return images;
  } catch {
    return null;
  }
}

function makeGalleryPublicId(src: string, index: number) {
  const filename =
    src
      .split("/")
      .pop()
      ?.replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-") || `image-${index + 1}`;

  return `gallery-${Date.now()}-${index + 1}-${filename}`;
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

  const formData = await request.formData();

  const srcValue = formData.get("src");
  const titleValue = formData.get("title");
  const dateValue = formData.get("date");
  const noteValue = formData.get("note");
  const categoryValue = formData.get("category");
  const yearValue = formData.get("year");
  const artTypeValue = formData.get("artType");
  const reviewTypeValue = formData.get("reviewType");
  const coverIndexValue = formData.get("coverIndex");
  const retainedValue = formData.get("retained");

  if (typeof srcValue !== "string" || !isValidPortfolioSrc(srcValue)) {
    return NextResponse.json(
      { error: "Invalid src." },
      { status: 400 }
    );
  }

  const retained = parseRetainedGallery(retainedValue);

  if (!retained) {
    return NextResponse.json(
      { error: "Invalid retained gallery data." },
      { status: 400 }
    );
  }

  if (retained.length === 0) {
    return NextResponse.json(
      { error: "Gallery must contain at least one image." },
      { status: 400 }
    );
  }

  const coverIndex = Number.parseInt(
    typeof coverIndexValue === "string" ? coverIndexValue : "0",
    10
  );

  if (
    !Number.isInteger(coverIndex) ||
    coverIndex < 0 ||
    coverIndex >= retained.length
  ) {
    return NextResponse.json(
      { error: "Invalid cover index." },
      { status: 400 }
    );
  }

  const metadata = await readPortfolioMetadata();

  const index = metadata.findIndex(
    (entry) => entry.src === srcValue
  );

  if (index === -1) {
    return NextResponse.json(
      { error: "Gallery item not found." },
      { status: 404 }
    );
  }

  const current = metadata[index];

  if (!current.gallery || current.gallery.length < 2) {
    return NextResponse.json(
      { error: "The selected portfolio item is not a gallery." },
      { status: 400 }
    );
  }

  const uploadedImages: PortfolioGalleryImage[] = [];

  try {
    /*
     * Keep the existing gallery images exactly as supplied by the client.
     * New files are appended in the order they appear in FormData.
     */
    for (const image of retained) {
      uploadedImages.push({
        src: image.src,
        ...(image.cloudinaryPublicId
          ? { cloudinaryPublicId: image.cloudinaryPublicId }
          : {}),
        ...(typeof image.width === "number"
          ? { width: image.width }
          : {}),
        ...(typeof image.height === "number"
          ? { height: image.height }
          : {}),
      });
    }

    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File);

    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];

      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: `Invalid image file: ${file.name}` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      const upload = await uploadPortfolioImage(
        buffer,
        `thelyka/portfolio/${yearValue || current.year}/${categoryValue || current.category}`,
        makeGalleryPublicId(file.name, fileIndex)
      );

      uploadedImages.push({
        src: upload.secureUrl,
        cloudinaryPublicId: upload.publicId,
        width: upload.width,
        height: upload.height,
      });
    }
  } catch (error) {
    console.error("PORTFOLIO GALLERY: upload failed", error);

    return NextResponse.json(
      { error: "Failed to upload gallery images." },
      { status: 500 }
    );
  }

  if (uploadedImages.length === 0) {
    return NextResponse.json(
      { error: "Gallery must contain at least one image." },
      { status: 400 }
    );
  }

  if (coverIndex >= uploadedImages.length) {
    return NextResponse.json(
      { error: "Invalid cover index." },
      { status: 400 }
    );
  }

  const coverImage = uploadedImages[coverIndex];

  const next: PortfolioMetadataEntry = {
    ...current,

    // Keep the selected cover as the legacy src.
    src: coverImage.src,

    gallery: uploadedImages,
    coverIndex,

    ...(typeof titleValue === "string"
      ? { title: sanitizeTitle(titleValue) }
      : {}),

    ...(typeof noteValue === "string"
      ? { note: sanitizeNote(noteValue) }
      : {}),

    ...(typeof dateValue === "string"
      ? { date: dateValue.trim() || undefined }
      : {}),

    ...(typeof yearValue === "string" && yearValue.trim()
      ? { year: yearValue.trim() }
      : {}),

    ...(typeof categoryValue === "string" && categoryValue.trim()
      ? { category: categoryValue.trim() as Category }
      : {}),

    // Preserve the existing cover dimensions.
    width: coverImage.width,
    height: coverImage.height,
  };

  if (
    typeof yearValue === "string" &&
    yearValue.trim() &&
    !/^\d{4}$/.test(yearValue.trim())
  ) {
    return NextResponse.json(
      { error: "Year must be a 4-digit number." },
      { status: 400 }
    );
  }

  if (
    typeof categoryValue === "string" &&
    categoryValue.trim() &&
    !isCategory(categoryValue.trim())
  ) {
    return NextResponse.json(
      { error: "Invalid category." },
      { status: 400 }
    );
  }

  if (typeof artTypeValue === "string" && artTypeValue.trim()) {
    if (!isArtType(artTypeValue.trim())) {
      return NextResponse.json(
        { error: "Invalid art type." },
        { status: 400 }
      );
    }

    next.artType = artTypeValue.trim();
  }

  if (typeof reviewTypeValue === "string" && reviewTypeValue.trim()) {
    if (!isReviewType(reviewTypeValue.trim())) {
      return NextResponse.json(
        { error: "Invalid review type." },
        { status: 400 }
      );
    }

    next.reviewType = reviewTypeValue.trim();
  }

  /*
   * IMPORTANT:
   * Do not touch variants or variantDimensions.
   *
   * They remain on `next` because we started with:
   *   { ...current }
   */

  metadata[index] = next;

  await writePortfolioMetadata(metadata);

  /*
   * Delete Cloudinary images that were removed from the gallery.
   *
   * Only delete assets that belonged to the previous gallery and are
   * no longer present in the new gallery.
   */
  const retainedCloudinaryIds = new Set(
    uploadedImages
      .map((image) => image.cloudinaryPublicId)
      .filter(
        (value): value is string => typeof value === "string"
      )
  );

  const oldGallery = current.gallery ?? [];

  for (const oldImage of oldGallery) {
    if (
      oldImage.cloudinaryPublicId &&
      isCloudinarySrc(oldImage.src) &&
      !retainedCloudinaryIds.has(oldImage.cloudinaryPublicId)
    ) {
      try {
        await deleteCloudinaryImage(oldImage.cloudinaryPublicId);
      } catch (error) {
        console.error(
          "PORTFOLIO GALLERY: failed to delete removed image",
          oldImage.cloudinaryPublicId,
          error
        );
      }
    }
  }

  /*
   * If the old cover changed, the old `src` may be different from the
   * new cover. The old image is already handled above through oldGallery.
   */

  revalidateTag("portfolio", { expire: 0 });

  return NextResponse.json({
    ok: true,
    entry: next,
  });
}