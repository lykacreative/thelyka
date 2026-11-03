import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSessionToken, readSessionToken, sessionSecretFrom } from "@/lib/session-token";
import { googleConfig, isEmailAllowed, originOf } from "@/lib/oidc";

export const SESSION_COOKIE = "lyka_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type AdminSession = { method: "google" | "password"; email: string | null; expiresAt: number };

// The session cookie is "v2.<expiry>.<subject>.<signature>" (lib/session-token.ts), signed with LYKA_SESSION_SECRET
// (or, until that's set, the admin password), so it can't be made up and changing the key logs every session out.
function sessionSecret() {
  return sessionSecretFrom(process.env);
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function passwordLoginEnabled() {
  return Boolean(process.env.LYKA_ADMIN_PASSWORD);
}

export function passwordMatches(provided: string) {
  const expected = process.env.LYKA_ADMIN_PASSWORD ?? "";
  return Boolean(expected) && safeEqual(provided, expected);
}

export function googleLogin() {
  const config = googleConfig(process.env);
  return {
    enabled: Boolean(config.clientId),
    missing: config.missing,
    sessionKeyMissing: !sessionSecret()
  };
}

export function createAdminSessionToken(subject: string) {
  return createSessionToken(sessionSecret(), subject, Date.now(), SESSION_MAX_AGE);
}

// A session only counts while its way in still exists: a Google session needs the email to still be on
// LYKA_ADMIN_EMAILS, a password session needs LYKA_ADMIN_PASSWORD to still be set.
export function sessionFromToken(token: string | undefined): AdminSession | null {
  const session = readSessionToken(sessionSecret(), token, Date.now());
  if (!session) return null;
  if (session.subject === "password") {
    return passwordLoginEnabled() ? { method: "password", email: null, expiresAt: session.expiresAt } : null;
  }
  if (session.subject.startsWith("google:")) {
    const email = session.subject.slice("google:".length);
    return isEmailAllowed(email, googleConfig(process.env).allowedEmails)
      ? { method: "google", email, expiresAt: session.expiresAt }
      : null;
  }
  return null;
}

export async function getAdminSession() {
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    return sessionFromToken(token);
  } catch {
    return null;
  }
}

export async function isAdminAuthenticated() {
  return (await getAdminSession()) !== null;
}

// Secure cookies everywhere except plain-http localhost (next dev).
export function cookieIsSecure(request: Request) {
  return originOf(request).startsWith("https:") || process.env.NODE_ENV === "production";
}

export function sessionCookieOptions(request: Request) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: cookieIsSecure(request),
    path: "/",
    maxAge: SESSION_MAX_AGE
  };
}

// Changes must come from the admin's own pages: a request another site's page sends is refused,
// on top of the SameSite=Lax session cookie.
function isSameOriginWrite(request: Request) {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(originOf(request)).host;
  } catch {
    return false;
  }
}

// Every admin API handler starts with: const denied = await requireAdmin(request); if (denied) return denied;
export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  if (!isSameOriginWrite(request)) {
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }
  if (await isAdminAuthenticated()) return null;
  return NextResponse.json({ error: "Not signed in." }, { status: 401 });
}
