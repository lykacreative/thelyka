// Unit tests for the admin logic that can run without secrets, a database or Cloudinary.
// Run: node --test tests/   (Node 22.18+ / 24 strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import {
  createSessionToken,
  readSessionToken,
  sessionSecretFrom,
  sealJson,
  openJson,
  safeEqual
} from "../lib/session-token.ts";
import {
  pkceChallenge,
  randomToken,
  isValidVerifier,
  parseAllowedEmails,
  isEmailAllowed,
  googleConfig,
  requestOrigin,
  originOf,
  googleRedirectUri,
  buildGoogleAuthUrl,
  decodeJwtPayload,
  checkIdTokenClaims,
  isOidcPending
} from "../lib/oidc.ts";
import { safeNextPath } from "../lib/safe-next-path.ts";
import {
  cloudinaryRoot,
  isUnderRoot,
  checkCloudinaryDelete,
  uploadFolder,
  uniquePublicId,
  fileNameBase,
  publicIdFromCloudinaryUrl,
  isProductionRuntime,
  isPreviewOrLocalDev
} from "../lib/cloudinary-root.ts";
import { slugify, isValidSlug, planSlugChange, yearFromDate, imageUrlsInMarkdown } from "../lib/blog-slug.ts";
import {
  isValidYear,
  isValidDate,
  galleryOf,
  coverFields,
  coverIndexOf,
  featuredRanks,
  nextFeaturedRank,
  cleanNote,
  cleanTitle
} from "../lib/item-rules.ts";
import { cloudinaryThumb } from "../lib/image-url.ts";

const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);
const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name.toLowerCase()] ?? null });

// ---------------------------------------------------------------- session cookie

test("session: signed token round-trips and carries the subject", () => {
  const token = createSessionToken("secret-1", "google:abrham@example.com", NOW, 3600);
  assert.match(token, /^v2\.\d+\.[A-Za-z0-9_-]+\.[0-9a-f]{64}$/);
  const session = readSessionToken("secret-1", token, NOW + 1000);
  assert.equal(session?.subject, "google:abrham@example.com");
});

test("session: wrong key, tampering, expiry and old-style cookies are rejected", () => {
  const token = createSessionToken("secret-1", "password", NOW, 3600);
  assert.equal(readSessionToken("secret-2", token, NOW), null, "other key");
  assert.equal(readSessionToken("secret-1", token, NOW + 3600 * 1000), null, "expired exactly at expiry");
  const [v, expiry, subject, sig] = token.split(".");
  assert.equal(readSessionToken("secret-1", [v, String(Number(expiry) + 999), subject, sig].join("."), NOW), null, "longer expiry");
  const otherSubject = Buffer.from("google:evil@example.com").toString("base64url");
  assert.equal(readSessionToken("secret-1", [v, expiry, otherSubject, sig].join("."), NOW), null, "swapped subject");
  assert.equal(readSessionToken("secret-1", "authenticated", NOW), null, "the old fixed cookie");
  assert.equal(readSessionToken("secret-1", `${expiry}.${sig}`, NOW), null, "the 2-part cookie of the password era");
  assert.equal(readSessionToken("", token, NOW), null, "no key = nobody is signed in");
  assert.throws(() => createSessionToken("", "password", NOW, 60));
});

test("session: LYKA_SESSION_SECRET wins, LYKA_ADMIN_PASSWORD is only the fallback", () => {
  assert.equal(sessionSecretFrom({ LYKA_SESSION_SECRET: "new", LYKA_ADMIN_PASSWORD: "old" }), "new");
  assert.equal(sessionSecretFrom({ LYKA_SESSION_SECRET: "  ", LYKA_ADMIN_PASSWORD: "old" }), "old");
  assert.equal(sessionSecretFrom({}), "");
});

test("session: sealed JSON is tamper-proof and purpose-bound", () => {
  const sealed = sealJson("k", "oidc", { a: 1 });
  assert.deepEqual(openJson("k", "oidc", sealed), { a: 1 });
  assert.equal(openJson("k", "other", sealed), null);
  assert.equal(openJson("x", "oidc", sealed), null);
  const [body, sig] = sealed.split(".");
  const forged = Buffer.from(JSON.stringify({ a: 2 })).toString("base64url");
  assert.equal(openJson("k", "oidc", `${forged}.${sig}`), null);
  assert.equal(openJson("k", "oidc", `${body}.`), null);
  assert.equal(safeEqual("abc", "abc"), true);
  assert.equal(safeEqual("abc", "abd"), false);
  assert.equal(safeEqual("abc", "ab"), false);
});

// ---------------------------------------------------------------- Google sign-in

test("PKCE: S256 challenge matches the RFC 7636 example", () => {
  assert.equal(
    pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  );
  const verifier = randomToken(32);
  assert.equal(verifier.length, 43);
  assert.ok(isValidVerifier(verifier));
  assert.ok(!isValidVerifier("short"));
  assert.notEqual(randomToken(), randomToken(), "state/nonce are random each time");
});

test("auth URL carries state, nonce, S256 challenge and the exact redirect URI", () => {
  const url = new URL(
    buildGoogleAuthUrl({ clientId: "cid", redirectUri: "https://www.lykamimics.com/api/admin/google/callback", state: "s1", nonce: "n1", codeChallenge: "c1" })
  );
  assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  const p = url.searchParams;
  assert.equal(p.get("response_type"), "code");
  assert.equal(p.get("scope"), "openid email");
  assert.equal(p.get("state"), "s1");
  assert.equal(p.get("nonce"), "n1");
  assert.equal(p.get("code_challenge"), "c1");
  assert.equal(p.get("code_challenge_method"), "S256");
  assert.equal(p.get("redirect_uri"), "https://www.lykamimics.com/api/admin/google/callback");
  assert.equal(p.get("login_hint"), null, "no email in the URL");
});

test("email allow-list: comma list, case and spaces don't matter, nothing else gets in", () => {
  const list = parseAllowedEmails(" Abrham@Example.com, second@example.org ,, not-an-email ");
  assert.deepEqual(list, ["abrham@example.com", "second@example.org"]);
  assert.ok(isEmailAllowed("ABRHAM@example.com ", list));
  assert.ok(!isEmailAllowed("abrham@example.com.evil.com", list));
  assert.ok(!isEmailAllowed("someone@example.com", list));
  assert.ok(!isEmailAllowed(undefined, list));
  assert.ok(!isEmailAllowed("abrham@example.com", []));
  assert.deepEqual(googleConfig({}).missing, ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "LYKA_ADMIN_EMAILS"]);
  assert.deepEqual(googleConfig({ GOOGLE_CLIENT_ID: "a", GOOGLE_CLIENT_SECRET: "b", LYKA_ADMIN_EMAILS: "x@y.co" }).missing, []);
});

test("redirect URI is built from the request origin (localhost, preview, www)", () => {
  assert.equal(requestOrigin("http://localhost:3000/api/admin/google/start", headers({})), "http://localhost:3000");
  assert.equal(
    requestOrigin("https://thelyka-git-feat-admin-rebuild-lyka-creative-s-projects.vercel.app/api/admin/google/start", headers({})),
    "https://thelyka-git-feat-admin-rebuild-lyka-creative-s-projects.vercel.app"
  );
  assert.equal(
    requestOrigin("http://127.0.0.1/x", headers({ "x-forwarded-host": "www.lykamimics.com", "x-forwarded-proto": "https" }), true),
    "https://www.lykamimics.com"
  );
  assert.equal(
    requestOrigin("http://localhost:3000/x", headers({ "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" })),
    "http://localhost:3000",
    "forwarded headers are ignored unless a trusted proxy (Vercel) sets them"
  );
  assert.equal(
    originOf({ url: "http://127.0.0.1/x", headers: headers({ "x-forwarded-host": "www.lykamimics.com", "x-forwarded-proto": "https" }) }, { VERCEL: "1" }),
    "https://www.lykamimics.com"
  );
  assert.equal(
    originOf({ url: "http://localhost:3000/x", headers: headers({ "x-forwarded-host": "evil.example" }) }, {}),
    "http://localhost:3000"
  );
  assert.equal(
    requestOrigin("https://www.lykamimics.com/x", headers({ "x-forwarded-host": "evil.com/path?", "x-forwarded-proto": "javascript" }), true),
    "https://www.lykamimics.com",
    "malformed forwarded values are ignored"
  );
  assert.equal(googleRedirectUri("https://www.lykamimics.com"), "https://www.lykamimics.com/api/admin/google/callback");
});

function jwt(claims: Record<string, unknown>) {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${part({ alg: "RS256" })}.${part(claims)}.sig`;
}

test("id_token claims: issuer, audience, expiry, nonce, email_verified and the allow-list are all required", () => {
  const nowSeconds = Math.floor(NOW / 1000);
  const good = {
    iss: "https://accounts.google.com",
    aud: "cid",
    azp: "cid",
    exp: nowSeconds + 3600,
    iat: nowSeconds,
    nonce: "n1",
    email: "Abrham@Example.com",
    email_verified: true
  };
  const expected = { clientId: "cid", nonce: "n1", nowSeconds, allowedEmails: ["abrham@example.com"] };
  const claims = decodeJwtPayload(jwt(good))!;
  assert.deepEqual(checkIdTokenClaims(claims, expected), { ok: true, email: "abrham@example.com" });
  const fail = (patch: Record<string, unknown>) => {
    const result = checkIdTokenClaims({ ...good, ...patch }, expected);
    return result.ok ? "ok" : result.error;
  };
  assert.equal(fail({ iss: "https://evil.example" }), "issuer");
  assert.equal(fail({ aud: "other-client" }), "audience");
  assert.equal(fail({ aud: ["cid", "other"], azp: "other" }), "audience");
  assert.equal(fail({ exp: nowSeconds - 3600 }), "expired");
  assert.equal(fail({ nonce: "replayed" }), "nonce");
  assert.equal(fail({ nonce: undefined }), "nonce");
  assert.equal(fail({ email_verified: false }), "unverified");
  assert.equal(fail({ email_verified: undefined }), "unverified");
  assert.equal(fail({ email: "someone@else.com" }), "not_allowed");
  assert.equal(fail({ email_verified: "true" }), "ok");
  assert.equal(decodeJwtPayload("not.a.jwt!"), null);
  assert.equal(decodeJwtPayload(undefined), null);
});

test("sign-in cookie shape is checked before use", () => {
  const pending = { state: "s", nonce: "n", verifier: randomToken(32), next: "/admin", redirectUri: "https://x/cb", exp: 1 };
  assert.ok(isOidcPending(pending));
  assert.ok(!isOidcPending({ ...pending, verifier: "short" }));
  assert.ok(!isOidcPending(null));
});

// ---------------------------------------------------------------- safe-next-path

test("safe-next-path: only same-site paths", () => {
  assert.equal(safeNextPath("/admin"), "/admin");
  assert.equal(safeNextPath("/admin?tab=blog"), "/admin?tab=blog");
  for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "evil.com", "/admin\n", "", null, undefined]) {
    assert.equal(safeNextPath(bad as string), "/admin", String(bad));
  }
});

// ---------------------------------------------------------------- Cloudinary root guard

test("Cloudinary root: env value, else live on production and preview everywhere else", () => {
  assert.equal(cloudinaryRoot({ VERCEL_ENV: "production" }), "thelyka");
  assert.equal(cloudinaryRoot({ VERCEL_ENV: "preview" }), "thelyka-preview");
  assert.equal(cloudinaryRoot({ NODE_ENV: "development" }), "thelyka-preview");
  assert.equal(cloudinaryRoot({ NODE_ENV: "production" }), "thelyka");
  assert.equal(cloudinaryRoot({ VERCEL_ENV: "preview", LYKA_CLOUDINARY_ROOT: "thelyka-preview" }), "thelyka-preview");
  assert.throws(() => cloudinaryRoot({ LYKA_CLOUDINARY_ROOT: "../thelyka" }));
  assert.throws(() => cloudinaryRoot({ LYKA_CLOUDINARY_ROOT: "a/b" }));
  assert.ok(isProductionRuntime({ VERCEL_ENV: "production", NODE_ENV: "production" }));
  assert.ok(!isProductionRuntime({ VERCEL_ENV: "preview", NODE_ENV: "production" }));
  assert.ok(isPreviewOrLocalDev({ VERCEL_ENV: "preview", NODE_ENV: "production" }));
  assert.ok(isPreviewOrLocalDev({ NODE_ENV: "development" }));
  assert.ok(!isPreviewOrLocalDev({ VERCEL_ENV: "production", NODE_ENV: "development" }));
  assert.ok(!isPreviewOrLocalDev({ NODE_ENV: "production" }));
});

test("Cloudinary root guard: only files under the root, never live files from a preview", () => {
  assert.ok(isUnderRoot("thelyka/portfolio/design/2026/a-1", "thelyka"));
  for (const bad of ["thelyka-preview/x", "thelyka", "thelyka/", "/thelyka/x", "thelyka/../x", "thelyka//x", "thelykax/y", "x/thelyka/y", "thelyka/a\\b", 42, null]) {
    assert.ok(!isUnderRoot(bad, "thelyka"), String(bad));
  }
  assert.ok(isUnderRoot("thelyka-preview/blog-media/2026/a", "thelyka-preview"));
  assert.ok(!isUnderRoot("thelyka/blog-media/2026/a", "thelyka-preview"));

  const live = { VERCEL_ENV: "production" };
  const preview = { VERCEL_ENV: "preview", LYKA_CLOUDINARY_ROOT: "thelyka-preview" };
  const misconfiguredPreview = { VERCEL_ENV: "preview", LYKA_CLOUDINARY_ROOT: "thelyka" };
  assert.deepEqual(checkCloudinaryDelete("thelyka/portfolio/a", live), { ok: true });
  assert.deepEqual(checkCloudinaryDelete("thelyka/portfolio/a", preview), { ok: false, reason: "outside-root" });
  assert.deepEqual(checkCloudinaryDelete("thelyka-preview/portfolio/a", preview), { ok: true });
  assert.deepEqual(checkCloudinaryDelete("thelyka/portfolio/a", misconfiguredPreview), { ok: false, reason: "live-file-outside-production" });
  assert.deepEqual(checkCloudinaryDelete("thelyka/portfolio/a", { VERCEL_ENV: "preview" }), { ok: false, reason: "outside-root" });
  assert.deepEqual(checkCloudinaryDelete("other/x", live), { ok: false, reason: "outside-root" });
});

test("uploads: folder under the root and a unique, readable public id", () => {
  assert.equal(uploadFolder("thelyka", "portfolio", "2024", "arts"), "thelyka/portfolio/arts/2024");
  assert.equal(uploadFolder("thelyka-preview", "blog", "2026"), "thelyka-preview/blog-media/2026");
  assert.throws(() => uploadFolder("thelyka", "portfolio", "24", "arts"));
  assert.throws(() => uploadFolder("thelyka", "portfolio", "2024", "../x"));
  assert.equal(fileNameBase("Beksiński – Self Portrait.PNG"), "beksinski-self-portrait");
  assert.equal(fileNameBase("Zdzisław.jpeg"), "zdzislaw");
  assert.equal(fileNameBase(".png"), "image");
  assert.equal(fileNameBase("图片.jpg"), "image");
  assert.equal(uniquePublicId("image.png", "k3j9x2ab01"), "image-k3j9x2ab01");
  assert.notEqual(uniquePublicId("image.png", "aaaaaaaaaa"), uniquePublicId("image.png", "bbbbbbbbbb"), "same name, different ids");
  assert.throws(() => uniquePublicId("image.png", "../x"));
});

test("public id from a Cloudinary URL (and only from plain upload URLs of this cloud)", () => {
  const src = "https://res.cloudinary.com/dgow1oztd/image/upload/v1793578511/thelyka/portfolio/reviews/2026/01-photo_1023-e58c1af9.jpg";
  assert.equal(publicIdFromCloudinaryUrl(src, "dgow1oztd"), "thelyka/portfolio/reviews/2026/01-photo_1023-e58c1af9");
  assert.equal(publicIdFromCloudinaryUrl(src, "othercloud"), null);
  assert.equal(publicIdFromCloudinaryUrl("https://res.cloudinary.com/dgow1oztd/image/upload/c_fill,w_200/v1/thelyka/a.jpg", "dgow1oztd"), null);
  assert.equal(publicIdFromCloudinaryUrl("https://res.cloudinary.com/dgow1oztd/image/upload/w_200/thelyka/a.jpg", "dgow1oztd"), null);
  assert.equal(publicIdFromCloudinaryUrl("https://res.cloudinary.com/dgow1oztd/image/upload/thelyka/a%20b.png", "dgow1oztd"), "thelyka/a b");
  assert.equal(publicIdFromCloudinaryUrl("https://example.com/x.jpg", "dgow1oztd"), null);
});

test("admin thumbnails are derived URLs; originals stay untouched", () => {
  const src = "https://res.cloudinary.com/dgow1oztd/image/upload/v1/thelyka/a.jpg";
  assert.equal(cloudinaryThumb(src, 120, "fill"), "https://res.cloudinary.com/dgow1oztd/image/upload/c_fill,g_center,w_120,h_120,q_auto,f_auto/v1/thelyka/a.jpg");
  assert.equal(cloudinaryThumb("/assets/x.png", 120), "/assets/x.png");
});

// ---------------------------------------------------------------- blog slugs

test("blog slugs: from titles, renames keep the old address for a redirect", () => {
  assert.equal(slugify("Zdzisław Beksiński, Photographing Dreams"), "zdzislaw-beksinski-photographing-dreams");
  assert.equal(slugify("Alexandre Cabanel, the Painter of Venus"), "alexandre-cabanel-the-painter-of-venus");
  assert.equal(slugify("  --  "), "");
  assert.ok(isValidSlug("alexandre-cabanel"));
  assert.ok(!isValidSlug("Alexandre"));
  assert.ok(!isValidSlug("a--b"));
  assert.ok(!isValidSlug("../x"));

  const renamed = planSlugChange({ slug: "alexandre-cabanel", oldSlugs: [] }, "cabanel-painter-of-venus");
  assert.deepEqual(renamed, { slug: "cabanel-painter-of-venus", oldSlugs: ["alexandre-cabanel"], changed: true });
  const again = planSlugChange({ slug: renamed.slug, oldSlugs: renamed.oldSlugs }, "cabanel");
  assert.deepEqual(again.oldSlugs, ["alexandre-cabanel", "cabanel-painter-of-venus"]);
  const back = planSlugChange({ slug: "cabanel", oldSlugs: again.oldSlugs }, "alexandre-cabanel");
  assert.deepEqual(back, { slug: "alexandre-cabanel", oldSlugs: ["cabanel-painter-of-venus", "cabanel"], changed: true }, "taking an old address back removes it from the redirects");
  assert.deepEqual(planSlugChange({ slug: "a", oldSlugs: ["b"] }, "a"), { slug: "a", oldSlugs: ["b"], changed: false });
  assert.equal(yearFromDate("2024-02-29", "2026"), "2024");
  assert.equal(yearFromDate("", "2026"), "2026");
  assert.deepEqual(
    imageUrlsInMarkdown("![a](https://res.cloudinary.com/d/image/upload/v1/x.jpg)\n:::split\n![b](https://res.cloudinary.com/d/image/upload/v1/y.jpg)\n:::\ntext\n:::\n![a](https://res.cloudinary.com/d/image/upload/v1/x.jpg)"),
    ["https://res.cloudinary.com/d/image/upload/v1/x.jpg", "https://res.cloudinary.com/d/image/upload/v1/y.jpg"]
  );
});

// ---------------------------------------------------------------- items

test("items: any 4-digit year, any real date, notes keep line breaks", () => {
  assert.ok(isValidYear("1999"));
  assert.ok(isValidYear("2031"));
  assert.ok(!isValidYear("99"));
  assert.ok(!isValidYear(2024));
  assert.ok(isValidDate(""));
  assert.ok(isValidDate("2024-02-29"));
  assert.ok(!isValidDate("2023-02-29"));
  assert.ok(isValidDate("1900-12-31"));
  assert.ok(!isValidDate("2024-13-01"));
  assert.ok(!isValidDate("2024-1-1"));
  assert.equal(cleanNote("line 1\r\nline 2\tx"), "line 1\nline 2 x");
  assert.equal(cleanTitle(" A\ntitle  "), "A title");
});

test("items: single-image records become galleries and the cover fields stay in step", () => {
  const single = { src: "https://r/a.jpg", cloudinaryPublicId: "thelyka/a", width: 10, height: 20 };
  assert.deepEqual(galleryOf(single), [{ src: "https://r/a.jpg", cloudinaryPublicId: "thelyka/a", width: 10, height: 20 }]);
  const gallery = [
    { src: "https://r/a.jpg", cloudinaryPublicId: "thelyka/a", width: 10, height: 20 },
    { src: "https://r/b.jpg", cloudinaryPublicId: "thelyka/b", width: 30, height: 40 }
  ];
  assert.deepEqual(coverFields(gallery, 1), { src: "https://r/b.jpg", cloudinaryPublicId: "thelyka/b", width: 30, height: 40, coverIndex: 1 });
  assert.equal(coverFields(gallery, 9).coverIndex, 0, "a bad index falls back to the first image");
  assert.throws(() => coverFields([], 0));
  assert.equal(coverIndexOf({ src: "https://r/b.jpg" }, gallery), 1, "older records without coverIndex use src");
  assert.equal(coverIndexOf({ coverIndex: 1, src: "https://r/a.jpg" }, gallery), 1);
});

test("featured: order becomes ranks 1..n, duplicates dropped, new ones go last", () => {
  assert.deepEqual([...featuredRanks(["c", "a", "c", "b"])], [["c", 1], ["a", 2], ["b", 3]]);
  assert.equal(nextFeaturedRank([3, null, 1, undefined]), 4);
  assert.equal(nextFeaturedRank([]), 1);
});

// ---------------------------------------------------------------- every admin API route checks the session

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? routeFiles(path) : name === "route.ts" ? [path] : [];
  });
}

test("audit: every admin API handler calls requireAdmin (except sign-in itself)", () => {
  const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const publicByDesign = new Set(["app/api/admin/auth/route.ts", "app/api/admin/google/start/route.ts", "app/api/admin/google/callback/route.ts"]);
  const files = routeFiles(join(decodeURIComponent(root), "app", "api"));
  assert.ok(files.length > 0);
  for (const file of files) {
    const rel = relative(decodeURIComponent(root), file).replace(/\\/g, "/");
    const source = readFileSync(file, "utf8");
    const handlers = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b[^{]*\{([\s\S]*?)\n\}/g)];
    assert.ok(handlers.length > 0, `${rel} exports handlers`);
    if (publicByDesign.has(rel)) continue;
    assert.ok(rel.startsWith("app/api/admin/"), `${rel}: every API route belongs to the admin`);
    for (const [, method, body] of handlers) {
      assert.match(body, /await requireAdmin\(request\)/, `${rel} ${method} must call requireAdmin(request) first`);
    }
  }
});
