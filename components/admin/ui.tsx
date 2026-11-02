"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cloudinaryThumb } from "@/lib/image-url";
import type { DeleteSummary } from "@/lib/admin-types";

// ------------------------------------------------------------------ toasts (one live region for the whole admin)

type Tone = "ok" | "bad" | "info";
type Toast = { id: number; message: string; tone: Tone };

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const notify = useCallback((message: string, tone: Tone = "info") => {
    const id = nextId.current++;
    setToasts((current) => [...current.slice(-3), { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), tone === "bad" ? 12000 : 6000);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "bad" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-lg items-start gap-3 rounded-lg border border-[var(--a-line-strong)] bg-[var(--a-raise)] px-4 py-3 text-sm shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 h-2 w-2 flex-none rounded-full"
              style={{ background: toast.tone === "ok" ? "var(--a-ok)" : toast.tone === "bad" ? "var(--a-bad)" : "var(--a-muted)" }}
            />
            <span className="min-w-0 flex-1 break-words">{toast.message}</span>
            <button
              type="button"
              className="flex-none text-[var(--a-muted)] hover:text-[var(--a-fg)]"
              onClick={() => setToasts((current) => current.filter((entry) => entry.id !== toast.id))}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// What happened to the Cloudinary files, in one sentence.
export function describeFiles(files: DeleteSummary | null | undefined) {
  if (!files) return "";
  const parts: string[] = [];
  if (files.deleted) parts.push(`${files.deleted} file${files.deleted === 1 ? "" : "s"} deleted from Cloudinary`);
  if (files.alreadyGone) parts.push(`${files.alreadyGone} already gone`);
  if (files.kept.length) {
    const reasons = Array.from(new Set(files.kept.map((entry) => entry.reason)));
    parts.push(`${files.kept.length} kept (${reasons.join("; ")})`);
  }
  if (files.failed.length) parts.push(`${files.failed.length} couldn't be deleted (${files.failed[0].reason})`);
  return parts.length ? `${parts.join(", ")}.` : "";
}

// ------------------------------------------------------------------ dialog

export function Dialog({
  open,
  title,
  children,
  onClose,
  labelledBy
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const headingId = labelledBy ?? `dialog-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open ? (
        <div className="p-5 sm:p-6">
          <h2 id={headingId} className="a-display text-2xl leading-tight">
            {title}
          </h2>
          <div className="mt-3 text-sm leading-relaxed text-[var(--a-muted)]">{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}

// ------------------------------------------------------------------ small pieces

export function Thumb({ src, size, alt = "", fill = true, className = "" }: { src: string; size: number; alt?: string; fill?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cloudinaryThumb(src, size * 2, fill ? "fill" : "fit")}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={className}
    />
  );
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="a-label">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className="a-chip"
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const index = options.findIndex((entry) => entry.value === value);
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                onChange(options[(index + 1) % options.length].value);
              } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                onChange(options[(index - 1 + options.length) % options.length].value);
              }
            }}
            tabIndex={value === option.value ? 0 : -1}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function SaveState({ state }: { state: SaveStatus }) {
  if (state.kind === "idle") return null;
  const color =
    state.kind === "saved" ? "var(--a-ok)" : state.kind === "error" ? "var(--a-bad)" : state.kind === "dirty" ? "var(--a-warn)" : "var(--a-muted)";
  const text =
    state.kind === "saving"
      ? "Saving…"
      : state.kind === "saved"
        ? `Saved ${state.at}${state.note ? `. ${state.note}` : ""}`
        : state.kind === "dirty"
          ? "Unsaved changes"
          : state.message;
  const live = state.kind === "error" ? "alert" : "status";
  return (
    <p role={live} className="flex min-w-0 items-start gap-2 text-sm" style={{ color }}>
      <span aria-hidden="true" className="mt-[0.45rem] h-2 w-2 flex-none rounded-full" style={{ background: color }} />
      <span className="min-w-0 break-words">{text}</span>
    </p>
  );
}

export type SaveStatus =
  | { kind: "idle" }
  | { kind: "dirty" }
  | { kind: "saving" }
  | { kind: "working"; message: string }
  | { kind: "saved"; at: string; note?: string }
  | { kind: "error"; message: string };

export function clock() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Ctrl/Cmd+S while a component is mounted and active.
export function useSaveShortcut(active: boolean, save: () => void) {
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}

export function hasFiles(event: React.DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}
