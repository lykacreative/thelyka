// Rules for portfolio items shared by the admin API and the admin UI. Pure (no imports) so tests can load it.

export type GalleryImage = {
  src: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
};

export function isValidYear(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}$/.test(value);
}

// "" (no date) or a real calendar date as YYYY-MM-DD. Any year is fine.
export function isValidDate(value: unknown): value is string {
  if (value === "") return true;
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = new Date(Date.UTC(2000, month, 0)).getUTCDate();
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const limit = month === 2 ? (leap ? 29 : 28) : daysInMonth;
  return day <= limit;
}

export function cleanTitle(value: string) {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 300);
}

// Notes keep their line breaks.
export function cleanNote(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\t/g, " ").replace(/\n{4,}/g, "\n\n\n").trim().slice(0, 20000);
}

// Every item is a gallery: older single-image records become a one-image gallery.
export function galleryOf(doc: {
  src?: unknown;
  cloudinaryPublicId?: unknown;
  width?: unknown;
  height?: unknown;
  gallery?: unknown;
}): GalleryImage[] {
  const gallery: GalleryImage[] = [];
  if (Array.isArray(doc.gallery)) {
    for (const raw of doc.gallery) {
      if (!raw || typeof raw !== "object") continue;
      const image = raw as Record<string, unknown>;
      if (typeof image.src !== "string" || !image.src.trim()) continue;
      gallery.push(cleanImage(image));
    }
  }
  if (gallery.length === 0 && typeof doc.src === "string" && doc.src.trim()) {
    gallery.push(cleanImage({ src: doc.src, cloudinaryPublicId: doc.cloudinaryPublicId, width: doc.width, height: doc.height }));
  }
  return gallery;
}

function cleanImage(image: Record<string, unknown>): GalleryImage {
  return {
    src: String(image.src).trim(),
    ...(typeof image.cloudinaryPublicId === "string" && image.cloudinaryPublicId.trim()
      ? { cloudinaryPublicId: image.cloudinaryPublicId.trim() }
      : {}),
    ...(isPositiveNumber(image.width) ? { width: image.width } : {}),
    ...(isPositiveNumber(image.height) ? { height: image.height } : {})
  };
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

// The cover's fields live on the item itself too (src, cloudinaryPublicId, width, height): keep them in step.
export function coverFields(gallery: GalleryImage[], coverIndex: number) {
  if (gallery.length === 0) throw new Error("An item needs at least one image.");
  const index = Number.isInteger(coverIndex) && coverIndex >= 0 && coverIndex < gallery.length ? coverIndex : 0;
  const cover = gallery[index];
  return {
    src: cover.src,
    cloudinaryPublicId: cover.cloudinaryPublicId ?? null,
    width: cover.width,
    height: cover.height,
    coverIndex: index
  };
}

export function coverIndexOf(doc: { coverIndex?: unknown; src?: unknown }, gallery: GalleryImage[]) {
  if (typeof doc.coverIndex === "number" && Number.isInteger(doc.coverIndex) && gallery[doc.coverIndex]) {
    return doc.coverIndex;
  }
  const bySrc = gallery.findIndex((image) => image.src === doc.src);
  return bySrc >= 0 ? bySrc : 0;
}

// Featured order: rank 1 is first on the homepage. Duplicates keep their first place.
export function featuredRanks(ids: string[]) {
  const ranks = new Map<string, number>();
  for (const id of ids) {
    if (typeof id === "string" && id && !ranks.has(id)) {
      ranks.set(id, ranks.size + 1);
    }
  }
  return ranks;
}

export function nextFeaturedRank(ranks: Array<number | null | undefined>) {
  const numbers = ranks.filter((rank): rank is number => typeof rank === "number" && Number.isFinite(rank));
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

export function isFeaturedRank(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
