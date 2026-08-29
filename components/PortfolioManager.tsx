"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { FaPenToSquare, FaTrashCan, FaXmark, FaUpload } from "react-icons/fa6";
import { categoryLabels } from "@/lib/copy";
import { artTypes, defaultArtType, type ArtType } from "@/lib/art-types";
import {
  defaultReviewType,
  reviewTypes,
  type ReviewType,
} from "@/lib/review-types";
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
  | { kind: "uploading" }
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
  year: currentYear(),
  artType: defaultArtType as ArtType,
  reviewType: defaultReviewType as ReviewType,
};

export function PortfolioManager({
  categories,
  existingYears,
  existingItems,
}: PortfolioManagerProps) {
  const router = useRouter();

  // Local copy of items so we can update the UI instantly
  const [items, setItems] = useState(existingItems);

  // Only sync from server when the number of items changes (upload / delete).
  // This prevents a stale server refresh from overwriting a note we just saved.
  const prevCountRef = useRef(existingItems.length);

  useEffect(() => {
    if (existingItems.length !== prevCountRef.current) {
      setItems(existingItems);
      prevCountRef.current = existingItems.length;
    }
  }, [existingItems]);

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          b.year.localeCompare(a.year) ||
          (b.date ?? "").localeCompare(a.date ?? "")
      ),
    [items]
  );

  const [editingSrc, setEditingSrc] = useState<string | null>(null);
  const [draft, setDraft] = useState({ ...emptyDraft });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [confirmDelete, setConfirmDelete] = useState<{
    src: string;
    title: string;
  } | null>(null);
  const [deleteFile, setDeleteFile] = useState(true);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadDraft, setUploadDraft] = useState({
    title: "",
    date: "",
    note: "",
    category: "design" as Category,
    year: currentYear(),
    artType: defaultArtType as ArtType,
    reviewType: defaultReviewType as ReviewType,
  });

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
      note: item.note ?? "",
      category: item.category,
      year: item.year,
      artType: item.artType ?? defaultArtType,
      reviewType: item.reviewType ?? defaultReviewType,
    });
    setStatus({ kind: "idle" });
  }

  function cancelEdit() {
    setEditingSrc(null);
    setDraft({ ...emptyDraft });
    setStatus({ kind: "idle" });
  }

  function openUpload() {
    setShowUpload(true);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadDraft({
      title: "",
      date: "",
      note: "",
      category: "design",
      year: currentYear(),
      artType: defaultArtType,
      reviewType: defaultReviewType,
    });
    setStatus({ kind: "idle" });
  }

  function closeUpload() {
    setShowUpload(false);
    setUploadFile(null);
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadPreview(null);
    setStatus({ kind: "idle" });
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (uploadPreview) URL.revokeObjectURL(uploadPreview);
    setUploadFile(file);
    setUploadPreview(file ? URL.createObjectURL(file) : null);

    if (file && !uploadDraft.title) {
      const name = file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ");
      setUploadDraft((d) => ({ ...d, title: name }));
    }
  }

  async function handleUpload(e?: FormEvent) {
    e?.preventDefault();

    if (!uploadFile) {
      setStatus({ kind: "error", message: "Please choose an image file." });
      return;
    }
    if (!uploadDraft.title.trim()) {
      setStatus({ kind: "error", message: "Title is required." });
      return;
    }

    setStatus({ kind: "uploading" });

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("title", uploadDraft.title.trim());
    formData.append("category", uploadDraft.category);
    formData.append("year", uploadDraft.year);
    if (uploadDraft.date.trim()) formData.append("date", uploadDraft.date.trim());
    if (uploadDraft.note.trim()) formData.append("note", uploadDraft.note.trim());
    if (uploadDraft.category === "arts") {
      formData.append("artType", uploadDraft.artType);
    }
    if (uploadDraft.category === "reviews") {
      formData.append("reviewType", uploadDraft.reviewType);
    }

    try {
      const response = await fetch("/api/portfolio/upload", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        src?: string;
      };
      if (!response.ok) {
        setStatus({
          kind: "error",
          message: payload.error ?? "Upload failed.",
        });
        return;
      }
      setStatus({ kind: "success", message: "Artwork uploaded successfully." });
      closeUpload();
      router.refresh();
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Upload failed.",
      });
    }
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
          year: draft.year,
          ...(draft.category === "arts" ? { artType: draft.artType } : {}),
          ...(draft.category === "reviews"
            ? { reviewType: draft.reviewType }
            : {}),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        entry?: PortfolioItem;
      };

      if (!response.ok) {
        setStatus({
          kind: "error",
          message: payload.error ?? "Save failed.",
        });
        return;
      }

      // Instant UI update
      if (payload.entry) {
        setItems((prev) =>
          prev.map((item) =>
            item.src === payload.entry!.src
              ? { ...item, ...payload.entry }
              : item
          )
        );
      }

      setStatus({ kind: "success", message: "Saved." });
      cancelEdit();

      // Slight delay so Cloudinary has time to update before a refresh
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Save failed.",
      });
    }
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return;
    setStatus({ kind: "deleting" });
    try {
      const response = await fetch("/api/portfolio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          src: confirmDelete.src,
          deleteFile,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setStatus({
          kind: "error",
          message: payload.error ?? "Delete failed.",
        });
        return;
      }

      // Instant UI update – remove the item
      setItems((prev) =>
        prev.filter((item) => item.src !== confirmDelete.src)
      );
      prevCountRef.current = prevCountRef.current - 1;

      setStatus({
        kind: "success",
        message: `Removed “${confirmDelete.title}”.`,
      });
      setConfirmDelete(null);
      if (editingSrc === confirmDelete.src) cancelEdit();
      router.refresh();
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Delete failed.",
      });
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
          {sortedItems.length} item{sortedItems.length === 1 ? "" : "s"} found. Click any artwork to edit
          its details.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openUpload}
            className="flex items-center gap-1.5 border border-[var(--frame)] bg-[var(--panel-bg)] px-3 py-1 font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90"
          >
            <FaUpload className="h-3 w-3" />
            Upload
          </button>

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
        <p className="font-sans text-xs tracking-normal text-emerald-700 dark:text-emerald-300">
          {status.message}
        </p>
      ) : null}

      {/* ========== UPLOAD MODAL ========== */}
      {showUpload ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="Upload artwork"
          onClick={closeUpload}
        >
          <div
            className="w-full max-w-lg border border-[var(--frame)] bg-[var(--modal-bg)] p-6 text-[var(--modal-fg)] shadow-[0_30px_90px_var(--shadow)] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-normal tracking-normal">
                Upload artwork
              </h2>
              <button
                type="button"
                onClick={closeUpload}
                className="grid h-8 w-8 place-items-center rounded-full border border-[var(--frame)] transition hover:bg-[var(--panel-bg)]"
                aria-label="Close"
              >
                <FaXmark className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleUpload(e);
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                  Image file
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-2 font-sans text-sm text-[var(--page-fg)] file:mr-3 file:border-0 file:bg-[var(--panel-bg)] file:px-3 file:py-1 file:text-xs file:font-medium file:uppercase file:text-[var(--panel-fg)]"
                  required
                />
                {uploadPreview && (
                  <div className="mt-3 relative aspect-square w-full max-w-[200px] overflow-hidden border border-[var(--frame)] bg-[var(--panel-bg)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={uploadPreview} alt="Preview" className="h-full w-full object-contain" />
                  </div>
                )}
              </div>

              <label className="block">
                <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Title</span>
                <input
                  type="text"
                  value={uploadDraft.title}
                  onChange={(e) => setUploadDraft({ ...uploadDraft, title: e.target.value })}
                  className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                  required
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Category</span>
                  <select
                    value={uploadDraft.category}
                    onChange={(e) => {
                      const next = e.target.value as Category;
                      setUploadDraft({
                        ...uploadDraft,
                        category: next,
                        ...(next === "arts" ? { artType: defaultArtType } : { artType: defaultArtType }),
                        ...(next === "reviews" ? { reviewType: defaultReviewType } : { reviewType: defaultReviewType }),
                      });
                    }}
                    className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                  >
                    {categories.map((value) => (
                      <option key={value} value={value}>{categoryLabels[value]}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Year</span>
                  <select
                    value={uploadDraft.year}
                    onChange={(e) => setUploadDraft({ ...uploadDraft, year: e.target.value })}
                    className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                  >
                    {yearOptions.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              </div>

              {uploadDraft.category === "arts" ? (
                <label className="block">
                  <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Art type</span>
                  <select
                    value={uploadDraft.artType}
                    onChange={(e) => setUploadDraft({ ...uploadDraft, artType: e.target.value as ArtType })}
                    className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                  >
                    {artTypes.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {uploadDraft.category === "reviews" ? (
                <label className="block">
                  <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Review type</span>
                  <select
                    value={uploadDraft.reviewType}
                    onChange={(e) => setUploadDraft({ ...uploadDraft, reviewType: e.target.value as ReviewType })}
                    className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                  >
                    {reviewTypes.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block">
                <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Date (optional)</span>
                <input
                  type="date"
                  value={uploadDraft.date}
                  onChange={(e) => setUploadDraft({ ...uploadDraft, date: e.target.value })}
                  className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">Artist note (optional)</span>
                <textarea
                  value={uploadDraft.note}
                  onChange={(e) => setUploadDraft({ ...uploadDraft, note: e.target.value })}
                  rows={3}
                  className="w-full resize-none border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={status.kind === "uploading"}
                  className="border border-[var(--frame)] bg-[var(--panel-bg)] px-4 py-2 font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90 disabled:opacity-60"
                >
                  {status.kind === "uploading" ? "Uploading…" : "Upload"}
                </button>
                <button
                  type="button"
                  onClick={closeUpload}
                  className="border border-[var(--frame)] bg-transparent px-4 py-2 font-sans text-xs font-medium uppercase tracking-normal text-[var(--modal-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
                >
                  Cancel
                </button>
                {status.kind === "error" && (
                  <span className="font-sans text-[11px] tracking-normal text-rose-700 dark:text-rose-300">
                    {status.message}
                  </span>
                )}
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* ========== EXISTING GRID ========== */}
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
              <p
                className="mt-3 truncate font-display text-base tracking-normal text-[var(--page-fg)]"
                title={item.title}
              >
                {item.title}
              </p>
              <p className="font-sans text-[11px] uppercase tracking-normal text-[var(--modal-fg)]/70">
                {categoryLabels[item.category]}
                {item.category === "arts" && item.artType ? ` · ${item.artType}` : ""}
                {item.category === "reviews" && item.reviewType ? ` · ${item.reviewType}` : ""}
                · {item.year}
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
                <form onSubmit={handleSave} className="max-h-96 overflow-y-auto border-t border-[var(--frame)] pt-3">
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                        Title
                      </span>
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
                        <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                          Category
                        </span>
                        <select
                          value={draft.category}
                          onChange={(event) => {
                            const next = event.target.value as Category;
                            setDraft({
                              ...draft,
                              category: next,
                              ...(next === "arts" ? { artType: defaultArtType } : { artType: defaultArtType }),
                              ...(next === "reviews" ? { reviewType: defaultReviewType } : { reviewType: defaultReviewType }),
                            });
                          }}
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
                        <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                          Year
                        </span>
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

                    {draft.category === "arts" ? (
                      <label className="block">
                        <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                          Art type
                        </span>
                        <select
                          value={draft.artType}
                          onChange={(event) =>
                            setDraft({ ...draft, artType: event.target.value as ArtType })
                          }
                          className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                        >
                          {artTypes.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    {draft.category === "reviews" ? (
                      <label className="block">
                        <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                          Review type
                        </span>
                        <select
                          value={draft.reviewType}
                          onChange={(event) =>
                            setDraft({ ...draft, reviewType: event.target.value as ReviewType })
                          }
                          className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                        >
                          {reviewTypes.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}

                    <label className="block">
                      <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                        Date
                      </span>
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                        className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                        Artist note
                      </span>
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
                        <span className="font-sans text-[11px] tracking-normal text-rose-700 dark:text-rose-300">
                          {status.message}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </form>
              ) : null}
            </li>
          );
        })}

        {sortedItems.length === 0 ? (
          <li className="col-span-full border border-dashed border-[var(--frame)] p-8 text-center font-display text-base tracking-normal text-[var(--modal-fg)]/70">
            No artwork found. Use the <strong>Upload</strong> button above to add your first piece.
          </li>
        ) : null}
      </ul>

      {/* Delete confirmation modal */}
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
              <span>
                Also delete the image file from{" "}
                <code className="rounded bg-[var(--panel-bg)] px-1 py-0.5 text-[var(--panel-fg)]">
                  public/portfolio
                </code>
              </span>
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
                <span className="font-sans text-[11px] tracking-normal text-rose-700 dark:text-rose-300">
                  {status.message}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}