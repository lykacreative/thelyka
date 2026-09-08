import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import {
  defaultArtType,
  isArtType,
  type ArtType,
} from "@/lib/art-types";

import {
  defaultReviewType,
  isReviewType,
  type ReviewType,
} from "@/lib/review-types";

import { connectToDatabase } from "@/lib/mongodb";

import {
  PORTFOLIO_COLLECTION,
  type PortfolioItemDoc,
} from "@/lib/portfolio-collection";

export const categories = [
  "design",
  "reviews",
  "arts",
] as const;

export type Category = (typeof categories)[number];

export type ImageDimensions = {
  width: number;
  height: number;
};

export type PortfolioGalleryImage = {
  src: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
};

export type PortfolioItem = {
  src: string;
  category: Category;
  year: string;
  title: string;
  note: string;
  date?: string;
  artType?: ArtType;
  reviewType?: ReviewType;

  // Existing single-image variant system.
  variants: string[];
  width: number;
  height: number;
  variantDimensions: Record<
    string,
    ImageDimensions
  >;

  // Gallery support.
  gallery?: PortfolioGalleryImage[];
  coverIndex?: number;
};

function isCategory(value: string): value is Category {
  return categories.includes(value as Category);
}

function resolveArtType(
  value: string | null | undefined,
  category: Category
): ArtType | undefined {
  if (category !== "arts") {
    return undefined;
  }

  if (value && isArtType(value)) {
    return value;
  }

  return defaultArtType;
}

function resolveReviewType(
  value: string | null | undefined,
  category: Category
): ReviewType | undefined {
  if (category !== "reviews") {
    return undefined;
  }

  if (value && isReviewType(value)) {
    return value;
  }

  return defaultReviewType;
}

function normalizeDimensions(
  doc: PortfolioItemDoc
): ImageDimensions {
  return {
    width:
      typeof doc.width === "number" &&
      doc.width > 0
        ? doc.width
        : 800,

    height:
      typeof doc.height === "number" &&
      doc.height > 0
        ? doc.height
        : 1000,
  };
}

function normalizeGallery(
  doc: PortfolioItemDoc
): PortfolioGalleryImage[] | undefined {
  if (
    !Array.isArray(doc.gallery) ||
    doc.gallery.length === 0
  ) {
    return undefined;
  }

  const gallery: PortfolioGalleryImage[] = [];

  for (const image of doc.gallery) {
    if (
      !image ||
      typeof image !== "object" ||
      typeof image.src !== "string" ||
      !image.src.trim()
    ) {
      continue;
    }

    gallery.push({
      src: image.src,

      cloudinaryPublicId:
        typeof image.cloudinaryPublicId ===
        "string"
          ? image.cloudinaryPublicId
          : undefined,

      width:
        typeof image.width === "number"
          ? image.width
          : undefined,

      height:
        typeof image.height === "number"
          ? image.height
          : undefined,
    });
  }

  return gallery.length > 0
    ? gallery
    : undefined;
}

function itemFromMongoDocument(
  doc: PortfolioItemDoc
): PortfolioItem | null {
  if (
    !doc ||
    typeof doc.src !== "string" ||
    !doc.src.trim()
  ) {
    return null;
  }

  if (
    typeof doc.category !== "string" ||
    !isCategory(doc.category)
  ) {
    return null;
  }

  const category = doc.category;

  const dimensions =
    normalizeDimensions(doc);

  /*
   * Gallery images are the source of variants.
   * We no longer read doc.variants because
   * PortfolioItemDoc does not contain that field.
   */
  const gallery =
    normalizeGallery(doc);

  const variants =
    gallery && gallery.length > 0
      ? gallery.map((image) => image.src)
      : [doc.src];

  /*
   * Make sure the cover image is always
   * included in variants.
   */
  if (!variants.includes(doc.src)) {
    variants.unshift(doc.src);
  }

  /*
   * Build dimensions from the gallery.
   */
  const variantDimensions: Record<
    string,
    ImageDimensions
  > = {};

  for (const image of gallery ?? []) {
    if (
      typeof image.width === "number" &&
      typeof image.height === "number" &&
      image.width > 0 &&
      image.height > 0
    ) {
      variantDimensions[image.src] = {
        width: image.width,
        height: image.height,
      };
    }
  }

  /*
   * Make sure every variant has dimensions.
   */
  for (const variant of variants) {
    if (!variantDimensions[variant]) {
      variantDimensions[variant] =
        dimensions;
    }
  }

  return {
    src: doc.src,

    category,

    year:
      typeof doc.year === "string" &&
      doc.year.trim()
        ? doc.year
        : new Date()
            .getFullYear()
            .toString(),

    title:
      typeof doc.title === "string" &&
      doc.title.trim()
        ? doc.title
        : "Untitled",

    note:
      typeof doc.note === "string"
        ? doc.note
        : "",

    date:
      typeof doc.date === "string" &&
      doc.date.trim()
        ? doc.date
        : undefined,

    artType: resolveArtType(
      doc.artType,
      category
    ),

    reviewType: resolveReviewType(
      doc.reviewType,
      category
    ),

    variants,

    width: dimensions.width,

    height: dimensions.height,

    variantDimensions,

    gallery,

    coverIndex:
      typeof doc.coverIndex === "number"
        ? doc.coverIndex
        : undefined,
  };
}

/**
 * MongoDB is now the source of truth for portfolio data.
 *
 * Images themselves live in Cloudinary.
 * MongoDB stores the Cloudinary URLs and metadata.
 */
async function scanPortfolioItems(): Promise<
  PortfolioItem[]
> {
  const { db } =
    await connectToDatabase();

   const collection = db.collection(
  PORTFOLIO_COLLECTION
);

  const documents = await collection
    .find({})
    .sort({
      year: -1,
      date: -1,
      createdAt: -1,
    })
    .toArray();

  const items: PortfolioItem[] = [];

  for (const document of documents) {
    const item =
      itemFromMongoDocument(document);

    if (item) {
      items.push(item);
    }
  }

  return items.sort((a, b) => {
    const yearSort =
      b.year.localeCompare(a.year);

    if (yearSort !== 0) {
      return yearSort;
    }

    return (
      (b.date ?? "").localeCompare(
        a.date ?? ""
      )
    );
  });
}

/**
 * Cache portfolio results for 5 minutes.
 *
 * Upload/edit/delete APIs should call:
 *
 * revalidateTag("portfolio")
 *
 * after changing portfolio data.
 */
const getCachedPortfolioItems =
  unstable_cache(
    scanPortfolioItems,
    ["portfolio-items"],
    {
      revalidate: 300,
      tags: ["portfolio"],
    }
  );

export const getPortfolioItems = cache(
  async () =>
    getCachedPortfolioItems()
);

export async function getItemsByCategory(
  category: Category
): Promise<PortfolioItem[]> {
  const items =
    await getPortfolioItems();

  return items.filter(
    (item) =>
      item.category === category
  );
}

export async function getItemsGroupedByCategory() {
  const grouped = await Promise.all(
    categories.map(async (category) => {
      const items =
        await getItemsByCategory(
          category
        );

      return [category, items] as const;
    })
  );

  return Object.fromEntries(
    grouped
  ) as Record<
    Category,
    PortfolioItem[]
  >;
}

/**
 * The logo is still stored locally in /public/assets.
 * This is unrelated to portfolio images.
 */
export function getLogoSrc() {
  const publicDir = path.join(
    process.cwd(),
    "public"
  );

  const logoPng = path.join(
    publicDir,
    "assets",
    "logo.png"
  );

  const logoSvg = path.join(
    publicDir,
    "assets",
    "logo.svg"
  );

  if (fs.existsSync(logoPng)) {
    return "/assets/logo.png";
  }

  if (fs.existsSync(logoSvg)) {
    return "/assets/logo.svg";
  }

  return "";
}