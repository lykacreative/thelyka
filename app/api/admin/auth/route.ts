import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const SESSION_COOKIE = "lyka_admin_session";
const SESSION_VALUE = "authenticated";

function expectedPassword() {
  return process.env.LYKA_ADMIN_PASSWORD ?? "";
}

export async function POST(request: Request) {
  const expected = expectedPassword();
  if (!expected) {
    return NextResponse.json(
      { error: "LYKA_ADMIN_PASSWORD is not set on the server." },
      { status: 500 }
    );
  }

  let body: { password?: string } = {};
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    body = {};
  }

  const provided = typeof body.password === "string" ? body.password : "";
  if (provided !== expected) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  cookies().set(SESSION_COOKIE, SESSION_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
