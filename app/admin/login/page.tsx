import { redirect } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import { LoginForm } from "@/components/LoginForm";
import { googleLogin, isAdminAuthenticated, passwordLoginEnabled } from "@/lib/admin-auth";
import { safeNextPath } from "@/lib/safe-next-path";

export const metadata = {
  title: "sign in"
};

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

const ERRORS: Record<string, string> = {
  config: "Google sign-in isn't fully set up on this deploy yet.",
  google_denied: "Google sign-in was cancelled.",
  expired: "The sign-in took too long or started in another tab. Try again.",
  state: "The sign-in couldn't be verified. Try again.",
  exchange: "Google didn't confirm the sign-in. Try again.",
  token: "Google's answer couldn't be verified. Try again.",
  unverified: "That Google account's email isn't verified.",
  not_allowed: "That Google account isn't allowed in this admin."
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const nextPath = safeNextPath(next);
  if (await isAdminAuthenticated()) {
    redirect(nextPath);
  }

  const google = googleLogin();
  const password = passwordLoginEnabled();
  const errorMessage = error ? ERRORS[error] ?? "Sign-in failed. Try again." : null;
  const googleHref = `/api/admin/google/start${nextPath !== "/admin" ? `?next=${encodeURIComponent(nextPath)}` : ""}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <section className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--a-muted)]">Lyka Mimics</p>
        <h1 className="a-display mt-2 text-5xl leading-none">Admin</h1>

        {errorMessage ? (
          <p role="alert" className="mt-8 rounded-md border border-[rgba(255,138,122,0.4)] bg-[rgba(255,138,122,0.1)] px-3 py-2 text-sm text-[var(--a-bad)]">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-8 space-y-6">
          {google.enabled ? (
            <div>
              <a href={googleHref} className="a-btn a-btn--primary w-full !min-h-[3rem] !text-[0.95rem]">
                <FcGoogle aria-hidden="true" className="h-5 w-5" />
                Sign in with Google
              </a>
              {google.missing.length > 0 || google.sessionKeyMissing ? (
                <p className="mt-2 text-xs leading-relaxed text-[var(--a-warn)]">
                  Still missing on this deploy:{" "}
                  {[...google.missing, ...(google.sessionKeyMissing ? ["LYKA_SESSION_SECRET"] : [])].join(", ")}.
                </p>
              ) : null}
            </div>
          ) : null}

          {password ? (
            <div className={google.enabled ? "border-t border-[var(--a-line)] pt-6" : ""}>
              {google.enabled ? (
                <p className="mb-3 text-xs text-[var(--a-muted)]">
                  Or the old password (this goes away once LYKA_ADMIN_PASSWORD is deleted in Vercel).
                </p>
              ) : null}
              <LoginForm nextPath={nextPath} autoFocus={!google.enabled} />
            </div>
          ) : null}

          {!google.enabled && !password ? (
            <p className="text-sm leading-relaxed text-[var(--a-warn)]">
              No way to sign in is set up on this deploy. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, LYKA_ADMIN_EMAILS and
              LYKA_SESSION_SECRET in Vercel, then redeploy.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
