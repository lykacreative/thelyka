import fs from "node:fs";
import path from "node:path";

export const categories = ["design", "reviews", "sketches"] as const;

export type Category = (typeof categories)[number];

export type PortfolioItem = {
  src: string;
  category: Category;
  year: string;
  title: string;
  note: string;
  date?: string;
};

type MetadataItem = Partial<PortfolioItem> & {
  src: string;
};

const publicDir = path.join(process.cwd(), "public");
const portfolioDir = path.join(publicDir, "portfolio");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg"]);

function titleFromFilename(file: string) {
  return path
    .basename(file, path.extname(file))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isCategory(value: string): value is Category {
  return categories.includes(value as Category);
}

function readMetadata() {
  const metadataPath = path.join(portfolioDir, "metadata.json");

  if (!fs.existsSync(metadataPath)) {
    return new Map<string, MetadataItem>();
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(metadataPath, "utf8")) as MetadataItem[];
    return new Map(parsed.filter((item) => item.src).map((item) => [item.src, item]));
  } catch {
    return new Map<string, MetadataItem>();
  }
}

export function getPortfolioItems(): PortfolioItem[] {
  const metadata = readMetadata();
  const items: PortfolioItem[] = [];

  for (const category of categories) {
    const categoryDir = path.join(portfolioDir, category);

    if (!fs.existsSync(categoryDir)) {
      continue;
    }

    const years = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));

    for (const year of years) {
      const yearDir = path.join(categoryDir, year);
      const files = fs
        .readdirSync(yearDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && imageExtensions.has(path.extname(entry.name).toLowerCase()))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));

      for (const file of files) {
        const src = `/portfolio/${category}/${year}/${file}`;
        const meta = metadata.get(src);
        const metaCategory = meta?.category && isCategory(meta.category) ? meta.category : category;

        items.push({
          src,
          category: metaCategory,
          year: meta?.year ?? year,
          title: meta?.title ?? titleFromFilename(file),
          note: meta?.note ?? "",
          date: meta?.date
        });
      }
    }
  }

  return items.sort((a, b) => {
    const yearSort = b.year.localeCompare(a.year);
    if (yearSort !== 0) return yearSort;
    return (b.date ?? "").localeCompare(a.date ?? "");
  });
}

export function getItemsByCategory(category: Category) {
  return getPortfolioItems().filter((item) => item.category === category);
}

export function getItemsGroupedByCategory() {
  return Object.fromEntries(categories.map((category) => [category, getItemsByCategory(category)])) as Record<
    Category,
    PortfolioItem[]
  >;
}

export function getLogoSrc() {
  const logoPng = path.join(publicDir, "assets", "logo.png");
  const logoSvg = path.join(publicDir, "assets", "logo.svg");

  if (fs.existsSync(logoPng)) return "/assets/logo.png";
  if (fs.existsSync(logoSvg)) return "/assets/logo.svg";
  return "";
}
