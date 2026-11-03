// Blog addresses. Pure (no imports) so the tests can load it directly.

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 120;

const SPECIAL_LETTERS: Record<string, string> = {
  "ł": "l", "Ł": "l", "ø": "o", "Ø": "o", "æ": "ae", "Æ": "ae", "œ": "oe", "Œ": "oe",
  "ß": "ss", "đ": "d", "Đ": "d", "ð": "d", "þ": "th", "ı": "i"
};

// "Zdzisław Beksiński, Photographing Dreams" -> "zdzislaw-beksinski-photographing-dreams"
export function slugify(text: string) {
  return text
    .replace(/[łŁøØæÆœŒßđĐðþı]/g, (letter) => SPECIAL_LETTERS[letter] ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}

// Renaming a post keeps it the same post: the new address becomes its slug and the old one is remembered,
// so /blogs/<old> can redirect permanently. Taking back an earlier address removes it from the old list.
export function planSlugChange(current: { slug: string; oldSlugs?: string[] | null }, nextSlug: string) {
  const previous = Array.isArray(current.oldSlugs) ? current.oldSlugs.filter(isValidSlug) : [];
  if (nextSlug === current.slug) {
    return { slug: nextSlug, oldSlugs: unique(previous.filter((slug) => slug !== nextSlug)), changed: false };
  }
  return {
    slug: nextSlug,
    oldSlugs: unique([...previous, current.slug].filter((slug) => slug !== nextSlug && isValidSlug(slug))),
    changed: true
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

// Blog year follows the post's date ("2026-11-02" -> "2026").
export function yearFromDate(date: string, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 4) : fallback;
}

// Cloudinary image URLs used in a post's Markdown, in order, without duplicates.
export function imageUrlsInMarkdown(content: string) {
  const urls = content.match(/https:\/\/res\.cloudinary\.com\/[^\s)"'<>]+/g) ?? [];
  return unique(urls);
}
