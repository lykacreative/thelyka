"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
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

type UploadMode = "single" | "gallery";

type UploadImage = {
  file: File;
  preview: string;
};

type EditGalleryImage = {
  src: string;
  cloudinaryPublicId?: string;
  width?: number;
  height?: number;
  file?: File;
  preview?: string;
};

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

  useEffect(() => {
    setItems(existingItems);
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

  // ============================================================
  // Edit state
  // ============================================================

  const [editingSrc, setEditingSrc] = useState<string | null>(null);
  const [editingGallery, setEditingGallery] = useState(false);
  const [editGalleryImages, setEditGalleryImages] = useState<
    EditGalleryImage[]
  >([]);
  const [editCoverIndex, setEditCoverIndex] = useState(0);
  const [editGalleryInputKey, setEditGalleryInputKey] = useState(0);

  const [draft, setDraft] = useState({ ...emptyDraft });
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const [confirmDelete, setConfirmDelete] = useState<{
    src: string;
    title: string;
  } | null>(null);

  const [deleteFile, setDeleteFile] = useState(true);

  // ============================================================
  // Upload state
  // ============================================================

  const [showUpload, setShowUpload] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>("single");
  const [uploadImages, setUploadImages] = useState<UploadImage[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);

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

  // ============================================================
  // Edit
  // ============================================================

  function startEdit(item: PortfolioItem) {
    const hasGallery = Boolean(item.gallery && item.gallery.length > 1);

    setEditingSrc(item.src);
    setEditingGallery(hasGallery);

    setEditGalleryImages(hasGallery ? [...(item.gallery ?? [])] : []);
    setEditCoverIndex(item.coverIndex ?? 0);

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
    // Revoke object URLs created for newly added gallery images.
    editGalleryImages.forEach((image) => {
      if (image.preview) {
        URL.revokeObjectURL(image.preview);
      }
    });

    setEditingSrc(null);
    setEditingGallery(false);
    setEditGalleryImages([]);
    setEditCoverIndex(0);
    setDraft({ ...emptyDraft });
    setStatus({ kind: "idle" });
  }

  function addEditGalleryFiles(files: File[]) {
    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      setStatus({
        kind: "error",
        message: "Please choose image files.",
      });
      return;
    }

    const newImages: EditGalleryImage[] = imageFiles.map((file) => {
      const preview = URL.createObjectURL(file);

      return {
        src: preview,
        preview,
        file,
      };
    });

    setEditGalleryImages((current) => [...current, ...newImages]);

    setStatus({ kind: "idle" });

    // Allow selecting the same file again.
    setEditGalleryInputKey((key) => key + 1);
  }

  // ============================================================
  // Upload helpers
  // ============================================================

  function revokeUploadPreviews(images: UploadImage[]) {
    for (const image of images) {
      URL.revokeObjectURL(image.preview);
    }
  }

  function resetUploadState() {
    revokeUploadPreviews(uploadImages);

    setUploadImages([]);
    setCoverIndex(0);
    setUploadMode("single");

    setUploadDraft({
      title: "",
      date: "",
      note: "",
      category: "design",
      year: currentYear(),
      artType: defaultArtType,
      reviewType: defaultReviewType,
    });
  }

  function openUpload() {
    resetUploadState();
    setShowUpload(true);
    setStatus({ kind: "idle" });
  }

  function closeUpload() {
    revokeUploadPreviews(uploadImages);

    setShowUpload(false);
    setUploadImages([]);
    setCoverIndex(0);
    setUploadMode("single");

    setStatus({ kind: "idle" });
  }

  function changeUploadMode(mode: UploadMode) {
    if (mode === uploadMode) return;

    // If switching back to single, keep only the current cover.
    if (mode === "single" && uploadImages.length > 1) {
      const selected = uploadImages[coverIndex];

      uploadImages.forEach((image, index) => {
        if (index !== coverIndex) {
          URL.revokeObjectURL(image.preview);
        }
      });

      setUploadImages(selected ? [selected] : []);
      setCoverIndex(0);
    }

    setUploadMode(mode);
  }

  function addUploadFiles(files: File[]) {
    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      setStatus({
        kind: "error",
        message: "Please choose image files.",
      });
      return;
    }

    const newImages = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setUploadImages((current) => {
      const next = [...current, ...newImages];

      // First selected image is automatically the cover.
      if (current.length === 0) {
        setCoverIndex(0);
      }

      return next;
    });

    // Automatically use the first filename as the title
    // when the title is still empty.
    if (!uploadDraft.title.trim() && imageFiles[0]) {
      const name = imageFiles[0].name
        .replace(/\.[^/.]+$/, "")
        .replace(/[-_]/g, " ");

      setUploadDraft((d) => ({
        ...d,
        title: name,
      }));
    }

    setStatus({ kind: "idle" });
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);

    addUploadFiles(files);

    // Allows selecting the same file again after removal.
    e.target.value = "";
  }

  function removeUploadImage(index: number) {
    setUploadImages((current) => {
      const image = current[index];

      if (!image) return current;

      URL.revokeObjectURL(image.preview);

      const next = current.filter(
        (_, imageIndex) => imageIndex !== index
      );

      setCoverIndex((currentCover) => {
        if (next.length === 0) {
          return 0;
        }

        if (index === currentCover) {
          // Removed the cover, so use the first remaining image.
          return 0;
        }

        if (index < currentCover) {
          return currentCover - 1;
        }

        return currentCover;
      });

      return next;
    });
  }

  function selectCover(index: number) {
    if (index < 0 || index >= uploadImages.length) return;

    setCoverIndex(index);
  }

  // ============================================================
  // Upload
  // ============================================================

  async function handleUpload(e?: FormEvent) {
    e?.preventDefault();

    if (uploadImages.length === 0) {
      setStatus({
        kind: "error",
        message: "Please choose an image file.",
      });
      return;
    }

    if (!uploadDraft.title.trim()) {
      setStatus({
        kind: "error",
        message: "Title is required.",
      });
      return;
    }

    if (
      uploadMode === "gallery" &&
      (coverIndex < 0 || coverIndex >= uploadImages.length)
    ) {
      setStatus({
        kind: "error",
        message: "Please choose a cover image.",
      });
      return;
    }

    setStatus({ kind: "uploading" });

    const formData = new FormData();

    if (uploadMode === "single") {
      // Preserve the existing single-image contract.
      formData.append("file", uploadImages[0].file);
    } else {
      // Gallery contract.
      uploadImages.forEach(({ file }) => {
        formData.append("files", file);
      });

      formData.append("coverIndex", String(coverIndex));
    }

    formData.append("title", uploadDraft.title.trim());
    formData.append("category", uploadDraft.category);
    formData.append("year", uploadDraft.year);

    if (uploadDraft.date.trim()) {
      formData.append("date", uploadDraft.date.trim());
    }

    if (uploadDraft.note.trim()) {
      formData.append("note", uploadDraft.note.trim());
    }

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

      setStatus({
        kind: "success",
        message:
          uploadMode === "gallery"
            ? "Gallery uploaded successfully."
            : "Artwork uploaded successfully.",
      });

      closeUpload();
      router.refresh();
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Upload failed.",
      });
    }
  }

  // ============================================================
  // Save existing artwork
  // ============================================================

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingSrc) return;

    if (!draft.title.trim()) {
      setStatus({
        kind: "error",
        message: "Title is required.",
      });
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
          ...(draft.category === "arts"
            ? { artType: draft.artType }
            : {}),
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

      if (payload.entry) {
        setItems((prev) =>
          prev.map((item) =>
            item.src === payload.entry!.src
              ? { ...item, ...payload.entry }
              : item
          )
        );
      }

      setStatus({
        kind: "success",
        message: "Saved.",
      });

      cancelEdit();

      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Save failed.",
      });
    }
  }

  async function handleSaveGallery() {
    if (!editingSrc || !editingGallery) return;

    if (editGalleryImages.length === 0) {
      setStatus({
        kind: "error",
        message: "Gallery must contain at least one image.",
      });
      return;
    }

    setStatus({ kind: "saving" });

    try {
      const formData = new FormData();

      formData.append("src", editingSrc);
      formData.append("title", draft.title.trim());
      formData.append("date", draft.date.trim());
      formData.append("note", draft.note.trim());
      formData.append("category", draft.category);
      formData.append("year", draft.year);
      formData.append("coverIndex", String(editCoverIndex));

      if (draft.category === "arts") {
        formData.append("artType", draft.artType);
      }

      if (draft.category === "reviews") {
        formData.append("reviewType", draft.reviewType);
      }

      /*
       * Existing images that are still part of the gallery.
       * New images are sent separately as files.
       */
      const retainedImages = editGalleryImages
        .filter((image) => !image.file)
        .map((image) => ({
          src: image.src,
          ...(image.cloudinaryPublicId
            ? { cloudinaryPublicId: image.cloudinaryPublicId }
            : {}),
          ...(typeof image.width === "number"
            ? { width: image.width }
            : {}),
          ...(typeof image.height === "number"
            ? { height: image.height }
            : {}),
        }));

      formData.append("retained", JSON.stringify(retainedImages));

      /*
       * New gallery images.
       *
       * The backend appends these in the same order they appear here.
       */
      editGalleryImages.forEach((image) => {
        if (image.file) {
          formData.append("files", image.file);
        }
      });

      const response = await fetch("/api/portfolio/gallery", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        entry?: PortfolioItem;
      };

      if (!response.ok || !data.ok || !data.entry) {
        throw new Error(data.error || "Failed to save gallery.");
      }

      /*
       * Revoke temporary object URLs created for newly added images.
       */
      editGalleryImages.forEach((image) => {
        if (image.preview) {
          URL.revokeObjectURL(image.preview);
        }
      });

      /*
       * Replace the updated item in the local list so the UI updates
       * immediately without requiring a full page reload.
       */
      setItems((currentItems) =>
        currentItems.map((item) =>
          item.src === editingSrc ? data.entry! : item
        )
      );

      /*
       * The cover may have changed, so the editing key needs to follow
       * the new src.
       */
      setEditingSrc(data.entry.src);
      setEditingGallery(true);
      setEditGalleryImages([...(data.entry.gallery ?? [])]);
      setEditCoverIndex(data.entry.coverIndex ?? 0);

      setStatus({
        kind: "success",
        message: "Gallery saved successfully.",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to save gallery.",
      });
    }
  }

  // ============================================================
  // Delete
  // ============================================================

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

      setItems((prev) =>
        prev.filter((item) => item.src !== confirmDelete.src)
      );

      setStatus({
        kind: "success",
        message: `Removed “${confirmDelete.title}”.`,
      });

      setConfirmDelete(null);

      if (editingSrc === confirmDelete.src) {
        cancelEdit();
      }

      router.refresh();
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Delete failed.",
      });
    }
  }

  // ============================================================
  // Logout
  // ============================================================

  async function handleLogout() {
    await fetch("/api/admin/auth", {
      method: "DELETE",
    });

    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-xs tracking-normal text-[var(--page-fg)]/70">
          {sortedItems.length} item
          {sortedItems.length === 1 ? "" : "s"} found. Click any artwork to
          edit its details.
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

      {/* ========================================================
          UPLOAD MODAL
          ======================================================== */}

      {showUpload ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="Upload artwork"
          onClick={closeUpload}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-[var(--frame)] bg-[var(--modal-bg)] p-6 text-[var(--modal-fg)] shadow-[0_30px_90px_var(--shadow)]"
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
              {/* Upload mode */}
              <div>
                <span className="mb-2 block font-sans text-[10px] font-medium uppercase tracking-normal">
                  Upload type
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => changeUploadMode("single")}
                    className={`border px-3 py-2 text-left font-sans text-xs uppercase tracking-normal transition ${
                      uploadMode === "single"
                        ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                        : "border-[var(--frame)]/50 bg-transparent text-[var(--modal-fg)] hover:bg-[var(--panel-bg)]"
                    }`}
                  >
                    <span className="block font-medium">
                      Single image
                    </span>
                    <span className="mt-1 block text-[10px] opacity-70">
                      Upload one artwork
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => changeUploadMode("gallery")}
                    className={`border px-3 py-2 text-left font-sans text-xs uppercase tracking-normal transition ${
                      uploadMode === "gallery"
                        ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                        : "border-[var(--frame)]/50 bg-transparent text-[var(--modal-fg)] hover:bg-[var(--panel-bg)]"
                    }`}
                  >
                    <span className="block font-medium">
                      Gallery
                    </span>
                    <span className="mt-1 block text-[10px] opacity-70">
                      Upload multiple images
                    </span>
                  </button>
                </div>
              </div>

              {/* Image uploader */}
              <div>
                <label className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                  {uploadMode === "gallery"
                    ? "Gallery images"
                    : "Image file"}
                </label>

                <input
                  type="file"
                  accept="image/*"
                  multiple={uploadMode === "gallery"}
                  onChange={handleFileChange}
                  className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-2 font-sans text-sm text-[var(--page-fg)] file:mr-3 file:border-0 file:bg-[var(--panel-bg)] file:px-3 file:py-1 file:text-xs file:font-medium file:uppercase file:text-[var(--panel-fg)]"
                  required={uploadImages.length === 0}
                />

                {uploadMode === "gallery" ? (
                  <p className="mt-1 font-sans text-[10px] text-[var(--modal-fg)]/60">
                    You can add as many images as you need. Select the
                    cover image below.
                  </p>
                ) : null}

                {/* Selected images */}
                {uploadImages.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {uploadImages.map((image, index) => {
                      const isCover =
                        uploadMode === "single" ||
                        coverIndex === index;

                      return (
                        <div
                          key={`${image.file.name}-${image.file.lastModified}-${index}`}
                          className={`group relative overflow-hidden border bg-[var(--panel-bg)] ${
                            isCover
                              ? "border-[var(--frame)] ring-2 ring-[var(--frame)]"
                              : "border-[var(--frame)]/40"
                          }`}
                        >
                          <div className="relative aspect-square w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image.preview}
                              alt={`Upload preview ${index + 1}`}
                              className="h-full w-full object-contain"
                            />

                            {isCover ? (
                              <div className="absolute left-2 top-2 border border-[var(--frame)] bg-[var(--panel-bg)] px-2 py-1 font-sans text-[9px] font-medium uppercase tracking-normal text-[var(--panel-fg)]">
                                Cover
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => removeUploadImage(index)}
                              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-[var(--frame)] bg-[var(--modal-bg)] text-[var(--modal-fg)] opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-rose-700 hover:text-white"
                              aria-label={`Remove image ${index + 1}`}
                            >
                              <FaXmark className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="border-t border-[var(--frame)]/40 p-2">
                            <p
                              className="truncate font-sans text-[10px] text-[var(--modal-fg)]/70"
                              title={image.file.name}
                            >
                              {image.file.name}
                            </p>

                            {uploadMode === "gallery" ? (
                              <button
                                type="button"
                                onClick={() => selectCover(index)}
                                className={`mt-2 w-full border px-2 py-1 font-sans text-[10px] font-medium uppercase tracking-normal transition ${
                                  isCover
                                    ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                                    : "border-[var(--frame)]/50 bg-transparent text-[var(--modal-fg)] hover:bg-[var(--panel-bg)]"
                                }`}
                              >
                                {isCover
                                  ? "Selected cover"
                                  : "Make cover"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}

                    {/* Add more button */}
                    {uploadMode === "gallery" ? (
                      <label className="flex aspect-square cursor-pointer flex-col items-center justify-center border border-dashed border-[var(--frame)]/60 bg-transparent p-4 text-center transition hover:bg-[var(--panel-bg)]">
                        <FaUpload className="mb-2 h-5 w-5 opacity-60" />

                        <span className="font-sans text-[10px] font-medium uppercase tracking-normal">
                          Add more
                        </span>

                        <span className="mt-1 font-sans text-[9px] opacity-60">
                          No limit
                        </span>

                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Title */}
              <label className="block">
                <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                  Title
                </span>

                <input
                  type="text"
                  value={uploadDraft.title}
                  onChange={(e) =>
                    setUploadDraft({
                      ...uploadDraft,
                      title: e.target.value,
                    })
                  }
                  className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                  required
                />
              </label>

              {/* Category + Year */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                    Category
                  </span>

                  <select
                    value={uploadDraft.category}
                    onChange={(e) => {
                      const next = e.target.value as Category;

                      setUploadDraft({
                        ...uploadDraft,
                        category: next,
                        artType: defaultArtType,
                        reviewType: defaultReviewType,
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
                    value={uploadDraft.year}
                    onChange={(e) =>
                      setUploadDraft({
                        ...uploadDraft,
                        year: e.target.value,
                      })
                    }
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

              {/* Art type */}
              {uploadDraft.category === "arts" ? (
                <label className="block">
                  <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                    Art type
                  </span>

                  <select
                    value={uploadDraft.artType}
                    onChange={(e) =>
                      setUploadDraft({
                        ...uploadDraft,
                        artType: e.target.value as ArtType,
                      })
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

              {/* Review type */}
              {uploadDraft.category === "reviews" ? (
                <label className="block">
                  <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                    Review type
                  </span>

                  <select
                    value={uploadDraft.reviewType}
                    onChange={(e) =>
                      setUploadDraft({
                        ...uploadDraft,
                        reviewType: e.target.value as ReviewType,
                      })
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

              {/* Date */}
              <label className="block">
                <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                  Date (optional)
                </span>

                <input
                  type="date"
                  value={uploadDraft.date}
                  onChange={(e) =>
                    setUploadDraft({
                      ...uploadDraft,
                      date: e.target.value,
                    })
                  }
                  className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                />
              </label>

              {/* Artist note */}
              <label className="block">
                <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                  Artist note (optional)
                </span>

                <textarea
                  value={uploadDraft.note}
                  onChange={(e) =>
                    setUploadDraft({
                      ...uploadDraft,
                      note: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full resize-none border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                />
              </label>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={
                    status.kind === "uploading" ||
                    uploadImages.length === 0
                  }
                  className="border border-[var(--frame)] bg-[var(--panel-bg)] px-4 py-2 font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90 disabled:opacity-60"
                >
                  {status.kind === "uploading"
                    ? "Uploading…"
                    : uploadMode === "gallery"
                      ? `Upload gallery (${uploadImages.length})`
                      : "Upload"}
                </button>

                <button
                  type="button"
                  onClick={closeUpload}
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
            </form>
          </div>
        </div>
      ) : null}

      {/* ========================================================
          EXISTING GRID
          ======================================================== */}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {sortedItems.map((item) => {
          const isEditing = editingSrc === item.src;

          return (
            <li
              key={item.src}
              className={`group border bg-[var(--modal-bg)] p-3 text-[var(--modal-fg)] shadow-[0_10px_30px_var(--shadow)] transition ${
                isEditing
                  ? "border-[var(--frame)] ring-2 ring-[var(--frame)]"
                  : "border-[var(--frame)]/40"
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
                {item.category === "arts" && item.artType
                  ? ` · ${item.artType}`
                  : ""}
                {item.category === "reviews" && item.reviewType
                  ? ` · ${item.reviewType}`
                  : ""}
                · {item.year}
                {item.date ? ` · ${item.date}` : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    isEditing ? cancelEdit() : startEdit(item)
                  }
                  className="flex flex-1 items-center justify-center gap-1 border border-[var(--frame)] bg-[var(--panel-bg)] px-2 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90"
                >
                  {isEditing ? (
                    <FaXmark aria-hidden="true" />
                  ) : (
                    <FaPenToSquare aria-hidden="true" />
                  )}

                  {isEditing ? "Close" : "Edit"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setConfirmDelete({
                      src: item.src,
                      title: item.title,
                    })
                  }
                  className="flex items-center justify-center gap-1 border border-[var(--frame)] bg-transparent px-2 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--modal-fg)] transition hover:bg-rose-700 hover:text-white"
                  aria-label={`Remove ${item.title}`}
                >
                  <FaTrashCan aria-hidden="true" />
                </button>
              </div>

              {/* ==================================================
                  EDIT FORM
                  ================================================== */}

              {isEditing ? (
                editingGallery ? (
                  <div className="max-h-96 overflow-y-auto border-t border-[var(--frame)] pt-3">
                    <div className="mb-4">
                      <h3 className="font-sans text-[11px] font-semibold uppercase tracking-normal">
                        Edit Gallery
                      </h3>

                      <p className="mt-1 font-sans text-[11px] text-[var(--modal-fg)]/70">
                        Manage the images in this gallery and choose the
                        cover image.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {editGalleryImages.map((image, index) => (
                        <div
                          key={`${image.src}-${index}`}
                          className={`group overflow-hidden border ${
                            editCoverIndex === index
                              ? "border-[var(--frame)] ring-2 ring-[var(--frame)]"
                              : "border-[var(--frame)]"
                          }`}
                        >
                          <div className="relative aspect-square">
                            <Image
                              src={image.preview ?? image.src}
                              alt={`${draft.title} gallery image ${
                                index + 1
                              }`}
                              fill
                              sizes="150px"
                              className="object-contain"
                            />

                            {/* Cover badge */}
                            {editCoverIndex === index ? (
                              <div className="absolute left-2 top-2 border border-[var(--frame)] bg-[var(--panel-bg)] px-2 py-1 font-sans text-[9px] font-medium uppercase tracking-normal text-[var(--panel-fg)]">
                                Cover
                              </div>
                            ) : null}

                            {/* Remove image */}
                            <button
                              type="button"
                              onClick={() => {
                                const imageToRemove =
                                  editGalleryImages[index];

                                if (!imageToRemove) return;

                                if (imageToRemove.preview) {
                                  URL.revokeObjectURL(
                                    imageToRemove.preview
                                  );
                                }

                                setEditGalleryImages((current) =>
                                  current.filter(
                                    (_, imageIndex) =>
                                      imageIndex !== index
                                  )
                                );

                                setEditCoverIndex((currentCover) => {
                                  const remainingCount =
                                    editGalleryImages.length - 1;

                                  if (remainingCount <= 0) {
                                    return 0;
                                  }

                                  // Removed image was before the cover.
                                  if (index < currentCover) {
                                    return currentCover - 1;
                                  }

                                  // Removed image was the cover.
                                  if (index === currentCover) {
                                    return 0;
                                  }

                                  // Cover is still valid.
                                  return currentCover;
                                });
                              }}
                              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full border border-[var(--frame)] bg-[var(--modal-bg)] text-[var(--modal-fg)] shadow-sm transition hover:bg-rose-700 hover:text-white"
                              aria-label={`Remove gallery image ${
                                index + 1
                              }`}
                              title="Remove image"
                            >
                              <FaXmark className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="border-t border-[var(--frame)] p-2">
                            <button
                              type="button"
                              onClick={() => setEditCoverIndex(index)}
                              className={`w-full px-2 py-1 font-sans text-[10px] font-medium uppercase tracking-normal transition ${
                                editCoverIndex === index
                                  ? "bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                                  : "border border-[var(--frame)] bg-transparent text-[var(--page-fg)] hover:bg-[var(--panel-bg)]"
                              }`}
                            >
                              {editCoverIndex === index
                                ? "Cover"
                                : "Make cover"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <input
                      key={editGalleryInputKey}
                      id="edit-gallery-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        addEditGalleryFiles(
                          Array.from(event.target.files ?? [])
                        );

                        event.target.value = "";
                      }}
                    />

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          document
                            .getElementById("edit-gallery-upload")
                            ?.click()
                        }
                        className="border border-[var(--frame)] bg-[var(--panel-bg)] px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90"
                      >
                        Add Images
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveGallery}
                        disabled={status.kind === "saving"}
                        className="border border-[var(--frame)] bg-[var(--panel-bg)] px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {status.kind === "saving"
                          ? "Saving..."
                          : "Save Gallery"}
                      </button>

                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="border border-[var(--frame)] bg-transparent px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--modal-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSave}
                    className="max-h-96 overflow-y-auto border-t border-[var(--frame)] pt-3"
                  >
                    <div className="space-y-3">
                      <label className="block">
                        <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                          Title
                        </span>

                        <input
                          type="text"
                          value={draft.title}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              title: event.target.value,
                            })
                          }
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
                              const next =
                                event.target.value as Category;

                              setDraft({
                                ...draft,
                                category: next,
                                artType: defaultArtType,
                                reviewType: defaultReviewType,
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
                            onChange={(event) =>
                              setDraft({
                                ...draft,
                                year: event.target.value,
                              })
                            }
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
                              setDraft({
                                ...draft,
                                artType:
                                  event.target.value as ArtType,
                              })
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
                              setDraft({
                                ...draft,
                                reviewType:
                                  event.target.value as ReviewType,
                              })
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
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              date: event.target.value,
                            })
                          }
                          className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                          Artist note
                        </span>

                        <textarea
                          value={draft.note}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              note: event.target.value,
                            })
                          }
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
                          {status.kind === "saving"
                            ? "Saving…"
                            : "Save"}
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
                )
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* ========================================================
          DELETE CONFIRMATION MODAL
          ======================================================== */}

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
            <h2 className="font-display text-2xl font-normal tracking-normal">
              Remove this artwork?
            </h2>

            <p className="mt-3 font-display text-sm leading-relaxed text-[var(--modal-fg)]/80">
              “{confirmDelete.title}” will be hidden from the site.
            </p>

            <label className="mt-4 flex items-center gap-2 font-sans text-sm">
              <input
                type="checkbox"
                checked={deleteFile}
                onChange={(event) =>
                  setDeleteFile(event.target.checked)
                }
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
                {status.kind === "deleting"
                  ? "Removing…"
                  : "Yes, remove"}
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