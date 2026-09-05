import fs from "node:fs/promises";
import path from "node:path";
import {
  isCloudinaryConfigured,
  portfolioUsesCloudinary,
  readCloudinaryMetadataRaw,
  writeCloudinaryMetadataRaw,
} from "@/lib/cloudinary";

export type PortfolioMetadataEntry = {
  src: string;
  cloudinaryPublicId?: string;
  category?: string;
  year?: string;
  title?: string;
  note?: string;
  date?: string;
  artType?: string;
  reviewType?: string;
  width?: number;
  height?: number;
};

const portfolioDir = path.join(process.cwd(), "public", "portfolio");
const metadataPath = path.join(portfolioDir, "metadata.json");

function usesCloudinaryStorage() {
  return portfolioUsesCloudinary() || (isCloudinaryConfigured() && process.env.PORTFOLIO_STORAGE === "cloudinary");
}

async function readLocalMetadata(): Promise<PortfolioMetadataEntry[]> {
  try {
    const raw = await fs.readFile(metadataPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PortfolioMetadataEntry[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalMetadata(items: PortfolioMetadataEntry[]) {
  await fs.mkdir(portfolioDir, { recursive: true });
  await fs.writeFile(metadataPath, JSON.stringify(items, null, 2) + "\n", "utf8");
}

export async function readPortfolioMetadata(): Promise<PortfolioMetadataEntry[]> {
  const local = await readLocalMetadata();

  if (usesCloudinaryStorage()) {
    try {
      const raw = await readCloudinaryMetadataRaw();
      if (!raw) {
        return local;
      }
      const parsed = JSON.parse(raw);
      const cloud = Array.isArray(parsed) ? (parsed as PortfolioMetadataEntry[]) : [];
      const merged = new Map<string, PortfolioMetadataEntry>();
      for (const item of local) {
        if (item.src) merged.set(item.src, item);
      }
      for (const item of cloud) {
        if (item.src) merged.set(item.src, item);
      }
      return Array.from(merged.values());
    } catch {
      return local;
    }
  }

  return local;
}

export async function writePortfolioMetadata(items: PortfolioMetadataEntry[]) {
  const json = JSON.stringify(items, null, 2) + "\n";

  // Always keep local in sync
  await writeLocalMetadata(items);

  if (usesCloudinaryStorage()) {
    await writeCloudinaryMetadataRaw(json);
  }
}

export function isRemotePortfolioSrc(src: string) {
  return src.startsWith("https://") || src.startsWith("http://");
}