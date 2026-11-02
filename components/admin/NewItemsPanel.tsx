"use client";

import { useEffect, useRef, useState } from "react";
import { artTypes } from "@/lib/art-types";
import { reviewTypes } from "@/lib/review-types";
import { api, titleFromFileName, todayIso, type UploadTarget } from "@/lib/admin-client";
import { isValidDate, isValidYear, type GalleryImage } from "@/lib/item-rules";
import type { AdminItem } from "@/lib/admin-types";
import { ImageGrid } from "@/components/admin/ImageGrid";
import { useUploadQueue } from "@/components/admin/useUploadQueue";
import { CATEGORY_OPTIONS } from "@/components/admin/ItemEditor";
import { Dialog, SaveState, Segmented, Thumb, useToast, type SaveStatus } from "@/components/admin/ui";

type Uploaded = GalleryImage & { title: string };

type NewItemsPanelProps = {
  initialFiles: File[];
  onCreated: (items: AdminItem[]) => void;
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

// New work: drop or pick many files; each uploads straight to Cloudinary with its own progress.
// Then either one gallery item with all of them, or one item per image (titled from the file names).
export function NewItemsPanel({ initialFiles, onCreated, onClose, onDirtyChange }: NewItemsPanelProps) {
  const notify = useToast();
  const [category, setCategory] = useState<AdminItem["category"]>("design");
  const [artType, setArtType] = useState<string>(artTypes[0]);
  const [reviewType, setReviewType] = useState<string>(reviewTypes[0]);
  const [date, setDate] = useState(todayIso());
  const [year, setYear] = useState(todayIso().slice(0, 4));
  const [note, setNote] = useState("");
  const [featured, setFeatured] = useState(false);
  const [mode, setMode] = useState<"one" | "each">("one");
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<Uploaded[]>([]);
  const [coverSrc, setCoverSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const settings = useRef({ category, year });
  settings.current = { category, year };
  const started = useRef(false);

  const uploads = useUploadQueue({
    onUploaded: (job, image) => {
      setImages((current) => [
        ...current,
        {
          src: image.src,
          cloudinaryPublicId: image.cloudinaryPublicId,
          ...(image.width ? { width: image.width } : {}),
          ...(image.height ? { height: image.height } : {}),
          title: titleFromFileName(job.name)
        }
      ]);
      setTitle((current) => current || titleFromFileName(job.name));
      setCoverSrc((current) => current ?? image.src);
      uploads.remove(job.key);
    }
  });
  const pending = uploads.jobs.filter((job) => job.status !== "done");
  const failed = uploads.jobs.filter((job) => job.status === "error");

  function addFiles(files: File[]) {
    const target: UploadTarget = {
      kind: "portfolio",
      category: settings.current.category,
      year: isValidYear(settings.current.year) ? settings.current.year : String(new Date().getFullYear())
    };
    const { skipped } = uploads.add(files, target);
    if (skipped.length) notify(`Skipped (not images): ${skipped.join(", ")}`, "bad");
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (initialFiles.length) addFiles(initialFiles);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasWork = images.length > 0 || pending.length > 0;
  useEffect(() => onDirtyChange(hasWork), [hasWork, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  function changeDate(next: string) {
    if (!year || year === date.slice(0, 4)) {
      if (/^\d{4}-/.test(next)) setYear(next.slice(0, 4));
    }
    setDate(next);
  }

  async function create() {
    if (busy) return;
    if (pending.length) return setStatus({ kind: "error", message: "Wait for the uploads to finish (or dismiss the failed ones)." });
    if (images.length === 0) return setStatus({ kind: "error", message: "Add at least one image." });
    if (!isValidYear(year)) return setStatus({ kind: "error", message: "Year must be 4 digits, like 2024." });
    if (!isValidDate(date)) return setStatus({ kind: "error", message: "That date isn't a real date." });
    if (mode === "one" && !title.trim()) return setStatus({ kind: "error", message: "Give the item a title." });
    if (mode === "each" && images.some((image) => !image.title.trim())) {
      return setStatus({ kind: "error", message: "Every item needs a title." });
    }

    const shared = {
      date,
      year,
      category,
      artType: category === "arts" ? artType : null,
      reviewType: category === "reviews" ? reviewType : null,
      note,
      featured
    };
    const batches =
      mode === "one"
        ? [{ title, gallery: images.map(({ title: _ignored, ...image }) => image), coverSrc }]
        : images.map(({ title: itemTitle, ...image }) => ({ title: itemTitle, gallery: [image], coverSrc: image.src }));

    setBusy(true);
    const created: AdminItem[] = [];
    try {
      for (let index = 0; index < batches.length; index += 1) {
        setStatus(batches.length > 1 ? { kind: "working", message: `Creating ${index + 1} of ${batches.length}…` } : { kind: "saving" });
        const result = await api<{ item: AdminItem }>("/api/admin/items", { method: "POST", body: { ...shared, ...batches[index] } });
        created.push(result.item);
      }
      onCreated(created);
      setImages([]);
      uploads.clear();
      notify(created.length === 1 ? `Created “${created[0].title}”.` : `Created ${created.length} items.`, "ok");
      onClose();
    } catch (error) {
      if (created.length) {
        onCreated(created);
        const createdSources = new Set(created.flatMap((item) => item.gallery.map((image) => image.src)));
        setImages((current) => current.filter((image) => !createdSources.has(image.src)));
      }
      setStatus({
        kind: "error",
        message: `${created.length ? `${created.length} created, then: ` : ""}${error instanceof Error ? error.message : "Create failed."}`
      });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    const publicIds = images.map((image) => image.cloudinaryPublicId).filter((id): id is string => Boolean(id));
    uploads.clear();
    setImages([]);
    setConfirmCancel(false);
    onClose();
    if (publicIds.length) {
      try {
        await api("/api/admin/uploads/discard", { method: "POST", body: { publicIds } });
      } catch {
        notify("Couldn't remove the cancelled uploads from Cloudinary (they stay there unused).", "bad");
      }
    }
  }

  return (
    <section aria-label="New work" className="mb-6 rounded-lg border border-[var(--a-line-strong)] bg-[var(--a-panel)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--a-line)] px-4 py-3 sm:px-6">
        <h2 className="a-display text-2xl">New work</h2>
        <p className="text-xs text-[var(--a-muted)]">Uploads start right away, at full quality.</p>
      </header>

      <div className="grid gap-5 p-4 sm:p-6">
        <ImageGrid
          images={images}
          coverSrc={mode === "one" ? coverSrc : null}
          uploads={uploads.jobs}
          onReorder={(next) => setImages(next as Uploaded[])}
          onCover={mode === "one" ? setCoverSrc : undefined}
          onRemove={(image) => {
            setImages((current) => current.filter((entry) => entry.src !== image.src));
            if (coverSrc === image.src) setCoverSrc(images.find((entry) => entry.src !== image.src)?.src ?? null);
            if (image.cloudinaryPublicId) {
              void api("/api/admin/uploads/discard", { method: "POST", body: { publicIds: [image.cloudinaryPublicId] } }).catch(() => undefined);
            }
          }}
          onAddFiles={addFiles}
          onRetryUpload={uploads.retry}
          onDismissUpload={uploads.remove}
          addLabel="Add files"
        />

        {images.length > 1 ? (
          <Segmented
            label="Make"
            value={mode}
            options={[
              { value: "one", label: `One item with ${images.length} images` },
              { value: "each", label: `${images.length} separate items` }
            ]}
            onChange={setMode}
          />
        ) : null}

        {mode === "one" || images.length <= 1 ? (
          <label className="block">
            <span className="a-label">Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
        ) : (
          <fieldset className="min-w-0">
            <legend className="a-label">Titles</legend>
            <ul className="grid gap-2">
              {images.map((image, index) => (
                <li key={image.src} className="flex min-w-0 items-center gap-3">
                  <Thumb src={image.src} size={40} className="h-10 w-10 flex-none rounded object-cover" />
                  <input
                    aria-label={`Title for image ${index + 1}`}
                    value={image.title}
                    onChange={(event) =>
                      setImages((current) => current.map((entry) => (entry.src === image.src ? { ...entry, title: event.target.value } : entry)))
                    }
                  />
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-[10.5rem_7rem]">
          <label className="block min-w-0">
            <span className="a-label">Date</span>
            <input type="date" value={date} onChange={(event) => changeDate(event.target.value)} />
          </label>
          <label className="block min-w-0">
            <span className="a-label">Year</span>
            <input inputMode="numeric" maxLength={4} value={year} onChange={(event) => setYear(event.target.value.replace(/\D/g, "").slice(0, 4))} />
          </label>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <Segmented label="Category" value={category} options={CATEGORY_OPTIONS.map((option) => ({ ...option }))} onChange={setCategory} />
          {category === "arts" ? (
            <Segmented label="Art type" value={artType} options={artTypes.map((value) => ({ value, label: value }))} onChange={setArtType} />
          ) : null}
          {category === "reviews" ? (
            <Segmented label="Review type" value={reviewType} options={reviewTypes.map((value) => ({ value, label: value }))} onChange={setReviewType} />
          ) : null}
        </div>

        <label className="block">
          <span className="a-label">Note {mode === "each" && images.length > 1 ? "(same for every item)" : ""}</span>
          <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} className="resize-y leading-relaxed" />
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
          Featured on the homepage
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--a-line)] px-4 py-3 sm:px-6">
        <button type="button" className="a-btn a-btn--primary" onClick={() => void create()} disabled={busy || images.length === 0 || pending.length > 0}>
          {busy ? "Creating…" : mode === "each" && images.length > 1 ? `Create ${images.length} items` : "Create item"}
        </button>
        <button type="button" className="a-btn a-btn--ghost" onClick={() => (hasWork ? setConfirmCancel(true) : onClose())} disabled={busy}>
          Cancel
        </button>
        <div className="min-w-0 flex-1 basis-40">
          <SaveState
            state={
              status.kind !== "idle"
                ? status
                : pending.length
                  ? failed.length
                    ? { kind: "error", message: `${failed.length} upload${failed.length === 1 ? "" : "s"} failed: retry or dismiss ${failed.length === 1 ? "it" : "them"}.` }
                    : { kind: "working", message: `Uploading ${pending.length} file${pending.length === 1 ? "" : "s"}…` }
                  : { kind: "idle" }
            }
          />
        </div>
      </div>

      <Dialog open={confirmCancel} title="Cancel this new work?" onClose={() => setConfirmCancel(false)}>
        <p>The files uploaded here are deleted from Cloudinary again.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="a-btn a-btn--danger" onClick={() => void cancel()}>
            Cancel and delete uploads
          </button>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => setConfirmCancel(false)}>
            Keep going
          </button>
        </div>
      </Dialog>
    </section>
  );
}
