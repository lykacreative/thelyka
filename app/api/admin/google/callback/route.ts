import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, createAdminSessionToken, sessionCookieOptions } from "@/lib/admin-auth";
import { safeNextPath } from "@/lib/safe-next-path";
import { openJson, safeEqual, sessionSecretFrom } from "@/lib/session-token";
import {
  GOOGLE_TOKEN_URL,
  checkIdTokenClaims,
  decodeJwtPayload,
  googleConfig,
  isOidcPending,
  originOf
} from "@/lib/oidc";
import { OIDC_COOKIE, backToLogin, oidcCookieOptions } from "@/lib/google-signin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Step 2 of Sign in with Google (public by design: Google sends the browser here). Checks the state against
// the signed cookie, swaps the code for tokens server-side over HTTPS with the PKCE verifier, checks the
// id_token (issuer, audience, expiry, nonce, email_verified, LYKA_ADMIN_EMAILS) and only then signs him in.
export async function GET(request: NextRequest) {
  const secret = sessionSecretFrom(process.env);
  const opened = openJson(secret, "oidc", request.cookies.get(OIDC_COOKIE)?.value);
  const pending = isOidcPending(opened) ? opened : null;
  const next = safeNextPath(pending?.next);
  const params = request.nextUrl.searchParams;

  if (params.get("error")) return backToLogin(request, "google_denied", next);
  if (!pending || pending.exp < Date.now()) return backToLogin(request, "expired", next);
  if (!safeEqual(params.get("state") ?? "", pending.state)) return backToLogin(request, "state", next);

  const code = params.get("code");
  if (!code) return backToLogin(request, "google_denied", next);

  const config = googleConfig(process.env);
  if (config.missing.length > 0) return backToLogin(request, "config", next);

  let idToken: unknown;
  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: pending.redirectUri,
        grant_type: "authorization_code",
        code_verifier: pending.verifier
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000)
    });
    const payload = (await tokenResponse.json().catch(() => ({}))) as { id_token?: unknown; error?: unknown };
    if (!tokenResponse.ok) {
      console.error("Google sign-in: code exchange refused", tokenResponse.status, String(payload.error ?? ""));
      return backToLogin(request, "exchange", next);
    }
    idToken = payload.id_token;
  } catch (error) {
    console.error("Google sign-in: code exchange failed", error instanceof Error ? error.message : error);
    return backToLogin(request, "exchange", next);
  }

  const claims = decodeJwtPayload(idToken);
  if (!claims) return backToLogin(request, "token", next);

  const check = checkIdTokenClaims(claims, {
    clientId: config.clientId,
    nonce: pending.nonce,
    nowSeconds: Math.floor(Date.now() / 1000),
    allowedEmails: config.allowedEmails
  });
  if (!check.ok) {
    return backToLogin(request, check.error === "not_allowed" || check.error === "unverified" ? check.error : "token", next);
  }

  const origin = originOf(request);
  const response = NextResponse.redirect(new URL(next, origin), 303);
  response.cookies.set(SESSION_COOKIE, createAdminSessionToken(`google:${check.email}`), sessionCookieOptions(request));
  response.cookies.set(OIDC_COOKIE, "", oidcCookieOptions(request, 0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
