import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { adminPasswordIsConfigured, isAdminAuthenticated } from "@/lib/admin-auth";

export const metadata = {
  title: "login · lyka mimics"
};

type LoginPageProps = {
  searchParams: {
    next?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  if (isAdminAuthenticated()) {
    redirect(searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/admin");
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
          nextPath={searchParams.next && searchParams.next.startsWith("/") ? searchParams.next : "/admin"}
          passwordConfigured={adminPasswordIsConfigured()}
        />
      </section>
    </main>
  );
}
