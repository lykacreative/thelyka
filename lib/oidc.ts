// Sign in with Google: a minimal OpenID Connect authorization-code flow with PKCE, state and nonce.
// Pure (only node:crypto) so tests/admin-logic.test.mts can load it directly.
import { createHash, randomBytes } from "node:crypto";

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
export const GOOGLE_CALLBACK_PATH = "/api/admin/google/callback";

export type RuntimeEnv = Record<string, string | undefined>;

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

// RFC 7636: code_challenge = BASE64URL(SHA256(code_verifier)).
export function pkceChallenge(verifier: string) {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

export function isValidVerifier(verifier: unknown): verifier is string {
  return typeof verifier === "string" && /^[A-Za-z0-9\-._~]{43,128}$/.test(verifier);
}

export function parseAllowedEmails(value: string | undefined | null) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(/[,;\s]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    )
  );
}

export function isEmailAllowed(email: unknown, allowed: string[]) {
  return typeof email === "string" && allowed.includes(email.trim().toLowerCase());
}

export function googleConfig(env: RuntimeEnv) {
  const clientId = (env.GOOGLE_CLIENT_ID ?? "").trim();
  const clientSecret = (env.GOOGLE_CLIENT_SECRET ?? "").trim();
  const allowedEmails = parseAllowedEmails(env.LYKA_ADMIN_EMAILS);
  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (allowedEmails.length === 0) missing.push("LYKA_ADMIN_EMAILS");
  return { clientId, clientSecret, allowedEmails, missing };
}

type HeaderReader = { get(name: string): string | null };

// The site's own origin for this request (localhost, the preview URL or www.lykamimics.com).
// Vercel passes the public host in x-forwarded-host; a malformed value falls back to the request URL.
export function requestOrigin(requestUrl: string, headers: HeaderReader) {
  const url = new URL(requestUrl);
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase() ?? "";
  const host = /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(forwardedHost) ? forwardedHost : url.host;
  const protocol = forwardedProto === "https" || forwardedProto === "http" ? forwardedProto : url.protocol.replace(":", "");
  return `${protocol}://${host}`;
}

export function googleRedirectUri(origin: string) {
  return `${origin}${GOOGLE_CALLBACK_PATH}`;
}

export function buildGoogleAuthUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: options.redirectUri,
    response_type: "code",
    scope: "openid email",
    state: options.state,
    nonce: options.nonce,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account"
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

// The id_token comes straight from Google's token endpoint over HTTPS (server to server), so per
// OpenID Connect Core 3.1.3.7 the TLS connection stands in for checking its signature; the claims are checked here.
export function decodeJwtPayload(jwt: unknown): Record<string, unknown> | null {
  if (typeof jwt !== "string") return null;
  const parts = jwt.split(".");
  if (parts.length !== 3 || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as unknown;
    return payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export type ClaimsCheck =
  | { ok: true; email: string }
  | { ok: false; error: "issuer" | "audience" | "expired" | "nonce" | "unverified" | "not_allowed" };

export function checkIdTokenClaims(
  claims: Record<string, unknown>,
  expected: { clientId: string; nonce: string; nowSeconds: number; allowedEmails: string[] }
): ClaimsCheck {
  if (typeof claims.iss !== "string" || !GOOGLE_ISSUERS.includes(claims.iss)) {
    return { ok: false, error: "issuer" };
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!expected.clientId || !audiences.includes(expected.clientId)) {
    return { ok: false, error: "audience" };
  }
  if (audiences.length > 1 && claims.azp !== expected.clientId) {
    return { ok: false, error: "audience" };
  }
  const skew = 300;
  if (typeof claims.exp !== "number" || claims.exp + skew < expected.nowSeconds) {
    return { ok: false, error: "expired" };
  }
  if (typeof claims.iat === "number" && claims.iat - skew > expected.nowSeconds) {
    return { ok: false, error: "expired" };
  }
  if (typeof claims.nonce !== "string" || !expected.nonce || claims.nonce !== expected.nonce) {
    return { ok: false, error: "nonce" };
  }
  if (claims.email_verified !== true && claims.email_verified !== "true") {
    return { ok: false, error: "unverified" };
  }
  if (!isEmailAllowed(claims.email, expected.allowedEmails)) {
    return { ok: false, error: "not_allowed" };
  }
  return { ok: true, email: String(claims.email).trim().toLowerCase() };
}

// What the sign-in cookie carries between /start and /callback.
export type OidcPending = { state: string; nonce: string; verifier: string; next: string; redirectUri: string; exp: number };

export function isOidcPending(value: unknown): value is OidcPending {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.state === "string" &&
    typeof v.nonce === "string" &&
    isValidVerifier(v.verifier) &&
    typeof v.next === "string" &&
    typeof v.redirectUri === "string" &&
    typeof v.exp === "number"
  );
}
