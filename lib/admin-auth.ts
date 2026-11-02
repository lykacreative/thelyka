import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "lyka_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

// The session cookie is "<expiry>.<signature>", signed with the admin password,
// so it can't be made up without the password and changing the password logs every session out.
function sign(expiry: string) {
  const secret = process.env.LYKA_ADMIN_PASSWORD ?? "";
  return createHmac("sha256", secret).update(`lyka-admin:${expiry}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken() {
  const expiry = String(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE);
  return `${expiry}.${sign(expiry)}`;
}

export function passwordMatches(provided: string) {
  const expected = process.env.LYKA_ADMIN_PASSWORD ?? "";
  return Boolean(expected) && safeEqual(provided, expected);
}

export async function isAdminAuthenticated() {
  if (!process.env.LYKA_ADMIN_PASSWORD) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature || Number(expiry) * 1000 < Date.now()) return false;
  return safeEqual(signature, sign(expiry));
}

export function adminPasswordIsConfigured() {
  return Boolean(process.env.LYKA_ADMIN_PASSWORD);
}
