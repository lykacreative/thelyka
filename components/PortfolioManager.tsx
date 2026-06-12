"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { FaPenToSquare, FaTrashCan, FaXmark } from "react-icons/fa6";
import { categoryLabels } from "@/lib/copy";
import type { Category, PortfolioItem } from "@/lib/portfolio";

type PortfolioManagerProps = {
  categories: Category[];
  existingYears: string[];
  existingItems: PortfolioItem[];
};

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "deleting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function currentYear() {
  return new Date().getFullYear().toString();
}

const emptyDraft = {
  title: "",
  date: "",
  note: "",
  category: "design" as Category,
  year: currentYear()
};

export function PortfolioManager({ categories, existingYears, existingItems }: PortfolioManagerProps) {
  const router = useRouter();
  const sortedItems = useMemo(
    () => [...existingItems].sort((a, b) => b.year.localeCompare(a.year) || (b.date ?? "").localeCompare(a.date ?? "")),
    [existingItems]
  );

  const [editingSrc, setEditingSrc] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirmDelete, setConfirmDelete] = useState<{ src: string; title: string } | null>(null);
  const [deleteFile, setDeleteFile] = useState(true);

  const yearOptions = useMemo(() => {
    const set = new Set<string>(existingYears);
    set.add(currentYear());
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [existingYears]);

  function startEdit(item: PortfolioItem) {
    setEditingSrc(item.src);
    setDraft({
      title: item.title,
      date: item.date ?? "",
      note: item.note,
      category: item.category,
      year: item.year
    });
    setStatus({ kind: "idle" });
  }

  function cancelEdit() {
    setEditingSrc(null);
    setDraft({ ...emptyDraft });
    setStatus({ kind: "idle" });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSrc) return;
    if (!draft.title.trim()) {
      setStatus({ kind: "error", message: "Title is required." });
      return;
    }

    setStatus({ kind: "saving" });
    try {
      const response = await fetch("/api/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          src: editingSrc,
          title: draft.title.trim(),
          date: draft.date.trim() || undefined,
          note: draft.note.trim(),
          category: draft.category,
          year: draft.year
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setStatus({ kind: "error", message: payload.error ?? "Save failed." });
        return;
      }
      setStatus({ kind: "success", message: "Saved." });
      cancelEdit();
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Save failed." });
    }
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return;
    setStatus({ kind: "deleting" });
    try {
      const response = await fetch("/api/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ src: confirmDelete.src, deleteFile })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setStatus({ kind: "error", message: payload.error ?? "Delete failed." });
        return;
      }
      setStatus({ kind: "success", message: `Removed “${confirmDelete.title}”.` });
      setConfirmDelete(null);
      if (editingSrc === confirmDelete.src) cancelEdit();
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Delete failed." });
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-xs tracking-normal text-[var(--page-fg)]/70">
          {sortedItems.length} item{sortedItems.length === 1 ? "" : "s"} found. Click any artwork to edit its details.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="border border-[var(--frame)] bg-transparent px-3 py-1 font-sans text-xs font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
          >
            View site
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="border border-[var(--frame)] bg-transparent px-3 py-1 font-sans text-xs font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
          >
            Log out
          </button>
        </div>
      </div>

      {status.kind === "success" ? (
        <p className="font-sans text-xs tracking-normal text-emerald-700 dark:text-emerald-300">{status.message}</p>
      ) : null}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {sortedItems.map((item) => {
          const isEditing = editingSrc === item.src;
          return (
            <li
              key={item.src}
              className={`group border bg-[var(--modal-bg)] p-3 text-[var(--modal-fg)] shadow-[0_10px_30px_var(--shadow)] transition ${
                isEditing ? "border-[var(--frame)] ring-2 ring-[var(--frame)]" : "border-[var(--frame)]/40"
              }`}
            >
              <span className="relative block aspect-square w-full overflow-hidden border border-[var(--frame)] bg-[var(--panel-bg)]">
                <Image
                  src={item.src}
                  alt={`${item.title} by lyka mimics`}
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 20vw"
                  className="object-contain"
                />
              </span>
              <p className="mt-3 truncate font-display text-base tracking-normal text-[var(--page-fg)]" title={item.title}>
                {item.title}
              </p>
              <p className="font-sans text-[11px] uppercase tracking-normal text-[var(--modal-fg)]/70">
                {categoryLabels[item.category]} · {item.year}
                {item.date ? ` · ${item.date}` : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => (isEditing ? cancelEdit() : startEdit(item))}
                  className="flex flex-1 items-center justify-center gap-1 border border-[var(--frame)] bg-[var(--panel-bg)] px-2 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90"
                >
                  {isEditing ? <FaXmark aria-hidden="true" /> : <FaPenToSquare aria-hidden="true" />}
                  {isEditing ? "Close" : "Edit"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete({ src: item.src, title: item.title })}
                  className="flex items-center justify-center gap-1 border border-[var(--frame)] bg-transparent px-2 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--modal-fg)] transition hover:bg-rose-700 hover:text-white"
                  aria-label={`Remove ${item.title}`}
                >
                  <FaTrashCan aria-hidden="true" />
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleSave} className="mt-3 space-y-3 border-t border-[var(--frame)] pt-3">
                  <label className="block">
                    <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Title</span>
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                      required
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Category</span>
                      <select
                        value={draft.category}
                        onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}
                        className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                      >
                        {categories.map((value) => (
                          <option key={value} value={value}>
                            {categoryLabels[value]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Year</span>
                      <select
                        value={draft.year}
                        onChange={(event) => setDraft({ ...draft, year: event.target.value })}
                        className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                      >
                        {yearOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Date</span>
                    <input
                      type="date"
                      value={draft.date}
                      onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                      className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Artist note</span>
                    <textarea
                      value={draft.note}
                      onChange={(event) => setDraft({ ...draft, note: event.target.value })}
                      rows={3}
                      className="w-full resize-none border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                    />
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="submit"
                      disabled={status.kind === "saving"}
                      className="border border-[var(--frame)] bg-[var(--panel-bg)] px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90 disabled:opacity-60"
                    >
                      {status.kind === "saving" ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="border border-[var(--frame)] bg-transparent px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--modal-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
                    >
                      Cancel
                    </button>
                    {status.kind === "error" ? (
                      <span className="font-sans text-[11px] tracking-normal text-rose-700 dark:text-rose-300">{status.message}</span>
                    ) : null}
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}

        {sortedItems.length === 0 ? (
          <li className="col-span-full border border-dashed border-[var(--frame)] p-8 text-center font-display text-base tracking-normal text-[var(--modal-fg)]/70">
            No artwork found. Drop images into
            <code className="mx-1 rounded bg-[var(--panel-bg)] px-1 py-0.5 text-[var(--panel-fg)]">public/portfolio/&lt;category&gt;/&lt;year&gt;/</code>
            and refresh.
          </li>
        ) : null}
      </ul>

      {confirmDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-md border border-[var(--frame)] bg-[var(--modal-bg)] p-6 text-[var(--modal-fg)] shadow-[0_30px_90px_var(--shadow)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="font-display text-2xl font-normal tracking-normal">Remove this artwork?</h2>
            <p className="mt-3 font-display text-sm leading-relaxed text-[var(--modal-fg)]/80">
              “{confirmDelete.title}” will be hidden from the site.
            </p>
            <label className="mt-4 flex items-center gap-2 font-sans text-sm">
              <input
                type="checkbox"
                checked={deleteFile}
                onChange={(event) => setDeleteFile(event.target.checked)}
                className="h-4 w-4"
              />
              <span>Also delete the image file from <code className="rounded bg-[var(--panel-bg)] px-1 py-0.5 text-[var(--panel-fg)]">public/portfolio</code></span>
            </label>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={confirmAndDelete}
                disabled={status.kind === "deleting"}
                className="border border-[var(--frame)] bg-rose-700 px-4 py-2 font-sans text-xs font-medium uppercase tracking-normal text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {status.kind === "deleting" ? "Removing…" : "Yes, remove"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="border border-[var(--frame)] bg-transparent px-4 py-2 font-sans text-xs font-medium uppercase tracking-normal text-[var(--modal-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
              >
                Cancel
              </button>
              {status.kind === "error" ? (
                <span className="font-sans text-[11px] tracking-normal text-rose-700 dark:text-rose-300">{status.message}</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
