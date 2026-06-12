"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type LoginFormProps = {
  nextPath: string;
  passwordConfigured: boolean;
};

export function LoginForm({ nextPath, passwordConfigured }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "submitting" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setStatus({ kind: "error", message: "Enter the password." });
      return;
    }

    setStatus({ kind: "submitting" });
    try {
      const response = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setStatus({ kind: "error", message: payload.error ?? "Login failed." });
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Login failed." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 w-full space-y-4 border border-[var(--frame)] bg-[var(--modal-bg)] p-6 text-[var(--modal-fg)] shadow-[0_20px_60px_var(--shadow)]">
      {!passwordConfigured ? (
        <p className="font-sans text-xs tracking-normal text-rose-700 dark:text-rose-300">
          LYKA_ADMIN_PASSWORD is not set. Add it to your <code>.env.local</code> file (and Vercel env vars) and redeploy.
        </p>
      ) : null}

      <label className="block">
        <span className="mb-2 block font-sans text-xs font-medium uppercase tracking-normal">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
          className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-2 font-display text-lg tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
          required
        />
      </label>

      <button
        type="submit"
        disabled={status.kind === "submitting"}
        className="w-full border border-[var(--frame)] bg-[var(--panel-bg)] px-5 py-2 font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-60"
      >
        {status.kind === "submitting" ? "Checking…" : "Enter"}
      </button>

      {status.kind === "error" ? (
        <p className="font-sans text-xs tracking-normal text-rose-700 dark:text-rose-300">{status.message}</p>
      ) : null}
    </form>
  );
}
