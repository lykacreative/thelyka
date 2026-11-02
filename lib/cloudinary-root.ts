// Where uploads go in Cloudinary and which files the admin may delete.
// Pure (no Next or "@/" imports) so tests/admin-logic.test.mts can load it directly.

export const LIVE_CLOUDINARY_ROOT = "thelyka";
export const PREVIEW_CLOUDINARY_ROOT = "thelyka-preview";

const ROOT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,62}$/;

export type RuntimeEnv = Record<string, string | undefined>;

// Production = the live site. Vercel tells us directly; elsewhere (local `next start`) NODE_ENV decides.
export function isProductionRuntime(env: RuntimeEnv) {
  if (env.VERCEL_ENV) {
    return env.VERCEL_ENV === "production";
  }
  return env.NODE_ENV === "production";
}

// Preview deploys and local dev: the only places the "copy the live items" tool may run.
export function isPreviewOrLocalDev(env: RuntimeEnv) {
  if (env.VERCEL_ENV === "preview") return true;
  if (env.VERCEL_ENV === "production") return false;
  return env.NODE_ENV === "development";
}

// LYKA_CLOUDINARY_ROOT when set; otherwise "thelyka" on production and "thelyka-preview" everywhere else,
// so a preview without the variable still can't write next to (or delete) live files.
export function cloudinaryRoot(env: RuntimeEnv) {
  const configured = (env.LYKA_CLOUDINARY_ROOT ?? "").trim();
  const root = configured || (isProductionRuntime(env) ? LIVE_CLOUDINARY_ROOT : PREVIEW_CLOUDINARY_ROOT);
  if (!ROOT_PATTERN.test(root)) {
    throw new Error(`LYKA_CLOUDINARY_ROOT "${root}" must be one folder name (a-z, 0-9, - and _).`);
  }
  return root;
}

// "thelyka/portfolio/x" is under "thelyka"; "thelyka-preview/x", "thelyka", "thelyka/../x" and "/thelyka/x" are not.
export function isUnderRoot(publicId: unknown, root: string) {
  if (typeof publicId !== "string" || !ROOT_PATTERN.test(root)) return false;
  if (!publicId.startsWith(`${root}/`)) return false;
  const rest = publicId.slice(root.length + 1);
  if (!rest) return false;
  return rest
    .split("/")
    .every((segment) => segment !== "" && segment !== "." && segment !== ".." && !/[\\\u0000-\u001f\u007f]/.test(segment));
}

export type DeleteCheck = { ok: true } | { ok: false; reason: "outside-root" | "live-file-outside-production" };

// The one gate every Cloudinary delete goes through.
export function checkCloudinaryDelete(publicId: unknown, env: RuntimeEnv): DeleteCheck {
  const root = cloudinaryRoot(env);
  if (!isUnderRoot(publicId, root)) {
    return { ok: false, reason: "outside-root" };
  }
  // Belt and braces: even if a preview is configured with the live root, it never deletes live files.
  if (!isProductionRuntime(env) && isUnderRoot(publicId, LIVE_CLOUDINARY_ROOT)) {
    return { ok: false, reason: "live-file-outside-production" };
  }
  return { ok: true };
}

export type UploadKind = "portfolio" | "blog";

export function uploadFolder(root: string, kind: UploadKind, year: string, category?: string) {
  if (!ROOT_PATTERN.test(root)) throw new Error("Invalid Cloudinary root.");
  if (!/^\d{4}$/.test(year)) throw new Error("Invalid year.");
  if (kind === "blog") return `${root}/blog-media/${year}`;
  if (!category || !/^[a-z]+$/.test(category)) throw new Error("Invalid category.");
  return `${root}/portfolio/${category}/${year}`;
}

const SPECIAL_LETTERS: Record<string, string> = {
  "ł": "l", "Ł": "l", "ø": "o", "Ø": "o", "æ": "ae", "Æ": "ae", "œ": "oe", "Œ": "oe",
  "ß": "ss", "đ": "d", "Đ": "d", "ð": "d", "þ": "th", "ı": "i"
};

// A readable, URL-safe base from a file name: "Beksiński – Self Portrait.PNG" -> "beksinski-self-portrait".
export function fileNameBase(filename: string) {
  const withoutExtension = filename.replace(/\.[^./\\]{1,8}$/, "");
  const ascii = withoutExtension
    .replace(/[łŁøØæÆœŒßđĐðþı]/g, (letter) => SPECIAL_LETTERS[letter] ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
  const base = ascii
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return base || "image";
}

// Every upload gets its own id (name + random suffix), so nothing is ever overwritten by a file with the same name.
export function uniquePublicId(filename: string, randomSuffix: string) {
  if (!/^[a-z0-9]{6,32}$/.test(randomSuffix)) throw new Error("Invalid random suffix.");
  return `${fileNameBase(filename)}-${randomSuffix}`;
}

// The public id inside a plain (untransformed) Cloudinary upload URL of this cloud, or null.
export function publicIdFromCloudinaryUrl(src: unknown, cloudName: string) {
  if (typeof src !== "string" || !cloudName) return null;
  const prefix = `https://res.cloudinary.com/${cloudName}/image/upload/`;
  if (!src.startsWith(prefix)) return null;
  let rest = src.slice(prefix.length).split(/[?#]/)[0];
  rest = rest.replace(/^v\d+\//, "");
  rest = rest.replace(/\.[a-zA-Z0-9]{2,5}$/, "");
  try {
    rest = decodeURIComponent(rest);
  } catch {
    return null;
  }
  const segments = rest.split("/");
  // A transformed URL (".../upload/c_fill,w_200/...") is a derived copy, not the file's own address.
  if (!rest || segments.some((segment) => !segment) || /,|^[a-z]{1,3}_/.test(segments[0])) {
    return null;
  }
  return rest;
}
