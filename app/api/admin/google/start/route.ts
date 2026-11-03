import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { sealJson, sessionSecretFrom } from "@/lib/session-token";
import {
  buildGoogleAuthUrl,
  googleConfig,
  googleRedirectUri,
  pkceChallenge,
  randomToken,
  originOf,
  type OidcPending
} from "@/lib/oidc";
import { OIDC_COOKIE, OIDC_MAX_AGE, backToLogin, oidcCookieOptions } from "@/lib/google-signin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Step 1 of Sign in with Google (public by design: it is the way in). Makes a fresh state, nonce and PKCE
// verifier, keeps them in a signed httpOnly cookie for 10 minutes and sends the browser to Google.
export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const config = googleConfig(process.env);
  const secret = sessionSecretFrom(process.env);
  if (config.missing.length > 0 || !secret) {
    return backToLogin(request, "config", next);
  }

  const redirectUri = googleRedirectUri(originOf(request));
  const verifier = randomToken(32);
  const pending: OidcPending = {
    state: randomToken(32),
    nonce: randomToken(32),
    verifier,
    next,
    redirectUri,
    exp: Date.now() + OIDC_MAX_AGE * 1000
  };

  const response = NextResponse.redirect(
    buildGoogleAuthUrl({
      clientId: config.clientId,
      redirectUri,
      state: pending.state,
      nonce: pending.nonce,
      codeChallenge: pkceChallenge(verifier)
    }),
    303
  );
  response.cookies.set(OIDC_COOKIE, sealJson(secret, "oidc", pending), oidcCookieOptions(request));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
