"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { safeNextPath } from "@/lib/safe-next-path";

type LoginFormProps = {
  nextPath: string;
  autoFocus?: boolean;
};

// The old password sign-in. Shown only while LYKA_ADMIN_PASSWORD is still set on the server.
export function LoginForm({ nextPath, autoFocus = false }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "submitting" } | { kind: "error"; message: string }>({
    kind: "idle"
  });

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
        setStatus({ kind: "error", message: payload.error ?? "Sign-in failed." });
        return;
      }
      router.replace(safeNextPath(nextPath));
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Sign-in failed." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span className="a-label">Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus={autoFocus}
          autoComplete="current-password"
          required
        />
      </label>
      <button type="submit" disabled={status.kind === "submitting"} className="a-btn w-full">
        {status.kind === "submitting" ? "Checking…" : "Sign in with password"}
      </button>
      {status.kind === "error" ? (
        <p role="alert" className="text-sm text-[var(--a-bad)]">
          {status.message}
        </p>
      ) : null}
    </form>
  );
}
