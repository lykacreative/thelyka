// Signed values for the admin: the session cookie and the short-lived Google sign-in cookie.
// Pure (only node:crypto) so tests/admin-logic.test.mts can load it directly.
import { createHmac, timingSafeEqual } from "node:crypto";

export type RuntimeEnv = Record<string, string | undefined>;

// LYKA_SESSION_SECRET signs sessions. Until it's set, the old LYKA_ADMIN_PASSWORD keeps signing them,
// so nothing breaks in the middle of the switch to Google sign-in.
export function sessionSecretFrom(env: RuntimeEnv) {
  const secret = (env.LYKA_SESSION_SECRET ?? "").trim();
  if (secret) return secret;
  return env.LYKA_ADMIN_PASSWORD ?? "";
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function hmac(secret: string, message: string) {
  return createHmac("sha256", secret).update(message).digest("hex");
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) return null;
  return Buffer.from(value, "base64url").toString("utf8");
}

// Session cookie: "v2.<expiry seconds>.<base64url subject>.<hmac>". The subject is "password" or "google:<email>".
export function createSessionToken(secret: string, subject: string, nowMs: number, maxAgeSeconds: number) {
  if (!secret) throw new Error("No session signing key.");
  const expiry = String(Math.floor(nowMs / 1000) + maxAgeSeconds);
  const encodedSubject = toBase64Url(subject);
  return `v2.${expiry}.${encodedSubject}.${hmac(secret, `lyka-admin:v2:${expiry}:${encodedSubject}`)}`;
}

export function readSessionToken(secret: string, token: string | null | undefined, nowMs: number) {
  if (!secret || !token) return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v2") return null;
  const [, expiry, encodedSubject, signature] = parts;
  if (!/^\d{1,12}$/.test(expiry) || Number(expiry) * 1000 <= nowMs) return null;
  if (!safeEqual(signature, hmac(secret, `lyka-admin:v2:${expiry}:${encodedSubject}`))) return null;
  const subject = fromBase64Url(encodedSubject);
  if (!subject) return null;
  return { subject, expiresAt: Number(expiry) * 1000 };
}

// A small signed JSON blob (used for the Google sign-in state). Signed, not encrypted: it lives in an httpOnly cookie.
export function sealJson(secret: string, purpose: string, data: unknown) {
  if (!secret) throw new Error("No signing key.");
  const body = toBase64Url(JSON.stringify(data));
  return `${body}.${hmac(secret, `lyka-${purpose}:${body}`)}`;
}

export function openJson(secret: string, purpose: string, sealed: string | null | undefined): unknown {
  if (!secret || !sealed) return null;
  const dot = sealed.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = sealed.slice(0, dot);
  const signature = sealed.slice(dot + 1);
  if (!safeEqual(signature, hmac(secret, `lyka-${purpose}:${body}`))) return null;
  const json = fromBase64Url(body);
  if (!json) return null;
  try {
    return JSON.parse(json) as unknown;
  } catch {
    return null;
  }
}
