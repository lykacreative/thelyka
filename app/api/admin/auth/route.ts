import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createAdminSessionToken,
  passwordLoginEnabled,
  passwordMatches,
  sessionCookieOptions
} from "@/lib/admin-auth";

export const runtime = "nodejs";

// Password sign-in: only while LYKA_ADMIN_PASSWORD is still set (the switch-over to Google sign-in).
// Public by design (it is the way in); the password check is timing-safe.
export async function POST(request: Request) {
  if (!passwordLoginEnabled()) {
    return NextResponse.json({ error: "Password sign-in is turned off. Use Sign in with Google." }, { status: 404 });
  }

  let body: { password?: unknown } = {};
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    body = {};
  }

  const provided = typeof body.password === "string" ? body.password : "";
  if (!passwordMatches(provided)) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createAdminSessionToken("password"), sessionCookieOptions(request));
  return response;
}

// Sign out: clears this browser's session cookie.
export async function DELETE(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(request), maxAge: 0 });
  return response;
}
