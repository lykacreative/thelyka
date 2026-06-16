import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { adminPasswordIsConfigured, isAdminAuthenticated } from "@/lib/admin-auth";

export const metadata = {
  title: "login"
};

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  if (await isAdminAuthenticated()) {
    redirect(next && next.startsWith("/") ? next : "/admin");
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--page-fg)] transition-colors duration-300">
      <ThemeToggle />
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-16">
        <h1 className="font-display text-[36px] font-normal leading-none tracking-normal sm:text-[48px]">
          Admin Login
        </h1>
        <p className="mt-3 text-center font-display text-sm tracking-normal text-[var(--page-fg)]/70">
          Enter the password to manage the portfolio.
        </p>

        <LoginForm
          nextPath={next && next.startsWith("/") ? next : "/admin"}
          passwordConfigured={adminPasswordIsConfigured()}
        />
      </section>
    </main>
  );
}
