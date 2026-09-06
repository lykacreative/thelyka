import path from "path";
import { mkdir, writeFile } from "fs/promises";
import {
  isCloudinaryConfigured,
  portfolioUsesCloudinary,
  uploadPortfolioImage,
} from "@/lib/cloudinary";

export const MAX_GALLERY_IMAGES = 4;

export function usesCloudStorage() {
  return (
    portfolioUsesCloudinary() ||
    (isCloudinaryConfigured() && process.env.PORTFOLIO_STORAGE === "cloudinary")
  );
}

export type UploadedImage = {
  src: string;
  cloudinaryPublicId?: string;
  width: number;
  height: number;
};

export type PortfolioImagePaths = {
  cloudFolder: string;
  localBaseDir: string;
  localPathPrefix: string;
};

export function buildPortfolioImagePaths(
  category: string,
  year: string,
  typeFolder: string
): PortfolioImagePaths {
  const cloudFolder = ["thelyka", "portfolio", category, ...(typeFolder ? [typeFolder, year] : [year])].join(
    "/"
  );
  const localBaseDir = path.join(
    process.cwd(),
    "public",
    "portfolio",
    category,
    ...(typeFolder ? [typeFolder, year] : [year])
  );
  const localPathPrefix = typeFolder
    ? `/portfolio/${category}/${typeFolder}/${year}`
    : `/portfolio/${category}/${year}`;

  return { cloudFolder, localBaseDir, localPathPrefix };
}

export async function uploadOnePortfolioImage(
  file: File,
  publicId: string,
  paths: PortfolioImagePaths,
  localDir: string,
  localPrefix: string,
  localFilename?: string
): Promise<UploadedImage> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".jpg";
  const base =
    file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .toLowerCase() || "image";
  const filename = localFilename ?? `${base}${ext}`;

  if (usesCloudStorage()) {
    const uploaded = await uploadPortfolioImage(buffer, paths.cloudFolder, publicId);
    return {
      src: uploaded.secureUrl,
      cloudinaryPublicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
    };
  }

  await mkdir(localDir, { recursive: true });
  await writeFile(path.join(localDir, filename), buffer);

  return {
    src: `${localPrefix}/${filename}`,
    width: 800,
    height: 1000,
  };
}

export function orderWithCover<T>(items: T[], coverIndex: number): T[] {
  if (items.length === 0) return [];
  const safeIndex = Math.min(Math.max(coverIndex, 0), items.length - 1);
  const cover = items[safeIndex];
  return [cover, ...items.filter((_, index) => index !== safeIndex)];
}
