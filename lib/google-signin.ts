import { NextResponse } from "next/server";
import { cookieIsSecure } from "@/lib/admin-auth";
import { originOf } from "@/lib/oidc";

// Short-lived cookie that carries state, nonce and the PKCE verifier from /start to /callback.
export const OIDC_COOKIE = "lyka_google_signin";
export const OIDC_COOKIE_PATH = "/api/admin/google";
export const OIDC_MAX_AGE = 10 * 60;

export function oidcCookieOptions(request: Request, maxAge = OIDC_MAX_AGE) {
  return { httpOnly: true, sameSite: "lax" as const, secure: cookieIsSecure(request), path: OIDC_COOKIE_PATH, maxAge };
}

export type SignInError =
  | "config"
  | "google_denied"
  | "expired"
  | "state"
  | "exchange"
  | "token"
  | "unverified"
  | "not_allowed";

// Back to the login page with an error code (never the email or any token in the URL).
export function backToLogin(request: Request, error: SignInError, next: string) {
  const origin = originOf(request);
  const url = new URL("/admin/login", origin);
  url.searchParams.set("error", error);
  if (next !== "/admin") url.searchParams.set("next", next);
  const response = NextResponse.redirect(url, 303);
  response.cookies.set(OIDC_COOKIE, "", oidcCookieOptions(request, 0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
