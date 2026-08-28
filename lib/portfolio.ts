import fs from "node:fs";
import path from "node:path";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import sharp from "sharp";
import {
  artTypeSlugs,
  defaultArtType,
  isArtType,
  type ArtType,
} from "@/lib/art-types";
import {
  defaultReviewType,
  isReviewType,
  reviewTypeSlugs,
  type ReviewType,
} from "@/lib/review-types";

export const categories = ["design", "reviews", "arts"] as const;

export type Category = (typeof categories)[number];

export type ImageDimensions = {
  width: number;
  height: number;
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
  variants: string[];
  width: number;
  height: number;
  variantDimensions: Record<string, ImageDimensions>;
};

type MetadataItem = {
  src: string;
  category?: string;
  year?: string;
  title?: string;
  note?: string;
  date?: string;
  artType?: string;
  reviewType?: string;
};

const publicDir = path.join(process.cwd(), "public");
const portfolioDir = path.join(publicDir, "portfolio");

const imageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".svg",
]);

async function getImageDimensions(
  filePath: string
): Promise<ImageDimensions> {
  const metadata = await sharp(filePath).metadata();

  return {
    width: metadata.width ?? 1,
    height: metadata.height ?? 1,
  };
}

function titleFromFilename(file: string) {
  return path
    .basename(file, path.extname(file))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isCategory(value: string): value is Category {
  return categories.includes(value as Category);
}

function isYearFolder(name: string) {
  return /^\d{4}$/.test(name);
}

function isArtTypeFolder(
  name: string
): name is (typeof artTypeSlugs)[number] {
  return artTypeSlugs.includes(name as (typeof artTypeSlugs)[number]);
}

function isReviewTypeFolder(
  name: string
): name is (typeof reviewTypeSlugs)[number] {
  return reviewTypeSlugs.includes(name as (typeof reviewTypeSlugs)[number]);
}

async function scanYearFolder(
  category: Category,
  year: string,
  dir: string,
  srcBase: string,
  metadata: Map<string, MetadataItem>
): Promise<PortfolioItem[]> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const subdirs = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  const files = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        imageExtensions.has(path.extname(entry.name).toLowerCase())
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const out: PortfolioItem[] = [];

  // Folders containing multiple images are treated as variants
  for (const subdir of subdirs) {
    const subdirPath = path.join(dir, subdir.name);

    const subFiles = fs
      .readdirSync(subdirPath, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          imageExtensions.has(
            path.extname(entry.name).toLowerCase()
          )
      )
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));

    if (subFiles.length === 0) {
      continue;
    }

    const variants = subFiles.map(
      (file) => `${srcBase}/${subdir.name}/${file}`
    );

    const src = variants[0];

    const meta =
      metadata.get(src) ??
      metadata.get(`${srcBase}/${subdir.name}`);

    const metaCategory =
      meta?.category && isCategory(meta.category)
        ? meta.category
        : category;

    const variantDimensions: Record<string, ImageDimensions> = {};

    for (const file of subFiles) {
      variantDimensions[`${srcBase}/${subdir.name}/${file}`] =
        await getImageDimensions(path.join(subdirPath, file));
    }

    out.push({
      src,
      category: metaCategory,
      year: meta?.year ?? year,
      title: meta?.title ?? titleFromFilename(subdir.name),
      note: meta?.note ?? "",
      date: meta?.date,
      artType: resolveArtType(meta, metaCategory),
      reviewType: resolveReviewType(meta, metaCategory),
      variants,
      width: variantDimensions[src].width,
      height: variantDimensions[src].height,
      variantDimensions,
    });
  }

  // Individual image files
  for (const file of files) {
    const src = `${srcBase}/${file}`;
    const filePath = path.join(dir, file);

    const meta = metadata.get(src);

    const metaCategory =
      meta?.category && isCategory(meta.category)
        ? meta.category
        : category;

    const dimensions = await getImageDimensions(filePath);

    out.push({
      src,
      category: metaCategory,
      year: meta?.year ?? year,
      title: meta?.title ?? titleFromFilename(file),
      note: meta?.note ?? "",
      date: meta?.date,
      artType: resolveArtType(meta, metaCategory),
      reviewType: resolveReviewType(meta, metaCategory),
      variants: [src],
      width: dimensions.width,
      height: dimensions.height,
      variantDimensions: {
        [src]: dimensions,
      },
    });
  }

  return out;
}

function resolveArtType(meta: MetadataItem | undefined, category: Category): ArtType | undefined {
  if (category !== "arts") {
    return undefined;
  }

  if (meta?.artType && isArtType(meta.artType)) {
    return meta.artType;
  }

  return defaultArtType;
}

function resolveReviewType(meta: MetadataItem | undefined, category: Category): ReviewType | undefined {
  if (category !== "reviews") {
    return undefined;
  }

  if (meta?.reviewType && isReviewType(meta.reviewType)) {
    return meta.reviewType;
  }

  return defaultReviewType;
}

function readMetadata() {
  const metadataPath = path.join(portfolioDir, "metadata.json");

  if (!fs.existsSync(metadataPath)) {
    return new Map<string, MetadataItem>();
  }

  try {
    const parsed = JSON.parse(
      fs.readFileSync(metadataPath, "utf8")
    ) as MetadataItem[];

    return new Map(
      parsed
        .filter((item) => item.src)
        .map((item) => [item.src, item])
    );
  } catch {
    return new Map<string, MetadataItem>();
  }
}

async function scanPortfolioItems(): Promise<PortfolioItem[]> {
  const metadata = readMetadata();
  const items: PortfolioItem[] = [];

  for (const category of categories) {
    const categoryDir = path.join(portfolioDir, category);

    if (!fs.existsSync(categoryDir)) {
      continue;
    }

    const dirs = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));

    // Arts may use the new nested layout:
    //   public/portfolio/arts/<artTypeSlug>/<year>/…
    // so scan each art-type folder separately before the legacy layout.
    if (category === "arts") {
      for (const artTypeFolder of dirs) {
        if (!isArtTypeFolder(artTypeFolder)) continue;

        const artDir = path.join(categoryDir, artTypeFolder);

        const artYears = fs
          .readdirSync(artDir, { withFileTypes: true })
          .filter(
            (entry) => entry.isDirectory() && isYearFolder(entry.name)
          )
          .map((entry) => entry.name)
          .sort((a, b) => b.localeCompare(a));

        for (const year of artYears) {
          items.push(
            ...(await scanYearFolder(
              "arts",
              year,
              path.join(artDir, year),
              `/portfolio/arts/${artTypeFolder}/${year}`,
              metadata
            ))
          );
        }
      }
    }

    // Reviews may use the new nested layout:
    //   public/portfolio/reviews/<reviewTypeSlug>/<year>/…
    // so scan each review-type folder separately before the legacy layout.
    if (category === "reviews") {
      for (const reviewTypeFolder of dirs) {
        if (!isReviewTypeFolder(reviewTypeFolder)) continue;

        const reviewDir = path.join(categoryDir, reviewTypeFolder);

        const reviewYears = fs
          .readdirSync(reviewDir, { withFileTypes: true })
          .filter(
            (entry) => entry.isDirectory() && isYearFolder(entry.name)
          )
          .map((entry) => entry.name)
          .sort((a, b) => b.localeCompare(a));

        for (const year of reviewYears) {
          items.push(
            ...(await scanYearFolder(
              "reviews",
              year,
              path.join(reviewDir, year),
              `/portfolio/reviews/${reviewTypeFolder}/${year}`,
              metadata
            ))
          );
        }
      }
    }

    // Legacy layout: public/portfolio/<category>/<year>/…
    const years = dirs.filter((name) => isYearFolder(name));

    for (const year of years) {
      const yearDir = path.join(categoryDir, year);
      const entries = fs.readdirSync(yearDir, { withFileTypes: true });

      const subdirs = entries
        .filter((entry) => entry.isDirectory())
        .sort((a, b) => a.name.localeCompare(b.name));

      const files = entries
        .filter(
          (entry) =>
            entry.isFile() &&
            imageExtensions.has(path.extname(entry.name).toLowerCase())
        )
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

      /*
       * Folders containing multiple images are treated as variants
       */
      if (subdirs.length > 0) {
        for (const subdir of subdirs) {
          const subdirPath = path.join(yearDir, subdir.name);

          const subFiles = fs
            .readdirSync(subdirPath, { withFileTypes: true })
            .filter(
              (entry) =>
                entry.isFile() &&
                imageExtensions.has(
                  path.extname(entry.name).toLowerCase()
                )
            )
            .map((entry) => entry.name)
            .sort((a, b) => a.localeCompare(b));

          if (subFiles.length === 0) {
            continue;
          }

          const variants = subFiles.map(
            (file) =>
              `/portfolio/${category}/${year}/${subdir.name}/${file}`
          );

          const src = variants[0];

          const meta =
            metadata.get(src) ??
            metadata.get(
              `/portfolio/${category}/${year}/${subdir.name}`
            );

          const metaCategory =
            meta?.category && isCategory(meta.category)
              ? meta.category
              : category;

          const variantDimensions: Record<
            string,
            ImageDimensions
          > = {};

          for (const file of subFiles) {
            const filePath = path.join(subdirPath, file);

            variantDimensions[
              `/portfolio/${category}/${year}/${subdir.name}/${file}`
            ] = await getImageDimensions(filePath);
          }

          const dimensions = variantDimensions[src];

          items.push({
            src,
            category: metaCategory,
            year: meta?.year ?? year,
            title: meta?.title ?? titleFromFilename(subdir.name),
            note: meta?.note ?? "",
            date: meta?.date,
            artType: resolveArtType(meta, metaCategory),
      reviewType: resolveReviewType(meta, metaCategory),
            variants,
            width: dimensions.width,
            height: dimensions.height,
            variantDimensions,
          });
        }
      }

      /*
       * Individual image files
       */
      if (files.length > 0) {
        for (const file of files) {
          const src = `/portfolio/${category}/${year}/${file}`;
          const filePath = path.join(yearDir, file);

          const meta = metadata.get(src);

          const metaCategory =
            meta?.category && isCategory(meta.category)
              ? meta.category
              : category;

          const dimensions = await getImageDimensions(filePath);

          items.push({
            src,
            category: metaCategory,
            year: meta?.year ?? year,
            title: meta?.title ?? titleFromFilename(file),
            note: meta?.note ?? "",
            date: meta?.date,
            artType: resolveArtType(meta, metaCategory),
      reviewType: resolveReviewType(meta, metaCategory),
            variants: [src],
            width: dimensions.width,
            height: dimensions.height,
            variantDimensions: {
              [src]: dimensions,
            },
          });
        }
      }
    }
  }

  return items.sort((a, b) => {
    const yearSort = b.year.localeCompare(a.year);

    if (yearSort !== 0) {
      return yearSort;
    }

    return (b.date ?? "").localeCompare(a.date ?? "");
  });
}

const getCachedPortfolioItems = unstable_cache(
  scanPortfolioItems,
  ["portfolio-items"],
  { revalidate: 300, tags: ["portfolio"] }
);

export const getPortfolioItems = cache(async () => getCachedPortfolioItems());

export async function getItemsByCategory(
  category: Category
): Promise<PortfolioItem[]> {
  const items = await getPortfolioItems();

  return items.filter((item) => item.category === category);
}

export async function getItemsGroupedByCategory() {
  const grouped = await Promise.all(
    categories.map(async (category) => {
      const items = await getItemsByCategory(category);

      return [category, items] as const;
    })
  );

  return Object.fromEntries(grouped) as Record<
    Category,
    PortfolioItem[]
  >;
}

export function getLogoSrc() {
  const logoPng = path.join(publicDir, "assets", "logo.png");
  const logoSvg = path.join(publicDir, "assets", "logo.svg");

  if (fs.existsSync(logoPng)) {
    return "/assets/logo.png";
  }

  if (fs.existsSync(logoSvg)) {
    return "/assets/logo.svg";
  }

  return "";
}