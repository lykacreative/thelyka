"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { artTypes } from "@/lib/art-types";
import { reviewTypes } from "@/lib/review-types";
import { api, type UploadTarget } from "@/lib/admin-client";
import { isValidDate, isValidYear, type GalleryImage } from "@/lib/item-rules";
import type { AdminItem, DeleteSummary } from "@/lib/admin-types";
import { ImageGrid } from "@/components/admin/ImageGrid";
import { useUploadQueue } from "@/components/admin/useUploadQueue";
import {
  Dialog,
  SaveState,
  Segmented,
  clock,
  describeFiles,
  useSaveShortcut,
  useToast,
  type SaveStatus
} from "@/components/admin/ui";

export const CATEGORY_OPTIONS = [
  { value: "design", label: "Design" },
  { value: "arts", label: "Art" },
  { value: "reviews", label: "Reviews" }
] as const;

type Category = AdminItem["category"];

type Draft = {
  title: string;
  date: string;
  year: string;
  category: Category;
  artType: string;
  reviewType: string;
  note: string;
  gallery: GalleryImage[];
  coverSrc: string;
  featured: boolean;
};

function draftOf(item: AdminItem): Draft {
  return {
    title: item.title,
    date: item.date,
    year: item.year,
    category: item.category,
    artType: item.artType ?? artTypes[0],
    reviewType: item.reviewType ?? reviewTypes[0],
    note: item.note,
    gallery: item.gallery,
    coverSrc: item.gallery[item.coverIndex]?.src ?? item.gallery[0]?.src ?? "",
    featured: item.featured !== null
  };
}

function sameDraft(a: Draft, b: Draft) {
  return (
    a.title === b.title &&
    a.date === b.date &&
    a.year === b.year &&
    a.category === b.category &&
    (a.category !== "arts" || a.artType === b.artType) &&
    (a.category !== "reviews" || a.reviewType === b.reviewType) &&
    a.note === b.note &&
    a.coverSrc === b.coverSrc &&
    a.featured === b.featured &&
    a.gallery.length === b.gallery.length &&
    a.gallery.every((image, index) => image.src === b.gallery[index].src)
  );
}

export function isUnderFolder(publicId: string | undefined, root: string) {
  return Boolean(publicId && publicId.startsWith(`${root}/`) && !publicId.includes(".."));
}

type ItemEditorProps = {
  item: AdminItem;
  active: boolean;
  cloudinaryRoot: string;
  onSaved: (item: AdminItem) => void;
  onDeleted: (id: string, files: DeleteSummary | null) => void;
  onClose: () => void;
  onDirtyChange: (id: string, dirty: boolean) => void;
};

// Edit one item in place: fields, images, cover, featured; save, discard or delete.
export function ItemEditor({ item, active, cloudinaryRoot, onSaved, onDeleted, onClose, onDirtyChange }: ItemEditorProps) {
  const notify = useToast();
  const baseline = useMemo(() => draftOf(item), [item]);
  const [draft, setDraft] = useState<Draft>(baseline);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [removing, setRemoving] = useState<GalleryImage | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const newUploads = useRef(new Set<string>());
  const pendingDeletes = useRef(new Set<string>());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const root = useRef<HTMLDivElement>(null);

  const uploads = useUploadQueue({
    onUploaded: (job, image) => {
      newUploads.current.add(image.cloudinaryPublicId);
      setDraft((current) => ({
        ...current,
        gallery: [
          ...current.gallery,
          {
            src: image.src,
            cloudinaryPublicId: image.cloudinaryPublicId,
            ...(image.width ? { width: image.width } : {}),
            ...(image.height ? { height: image.height } : {})
          }
        ]
      }));
      uploads.remove(job.key);
    }
  });
  const pendingUploads = uploads.jobs.filter((job) => job.status !== "done");
  const uploading = pendingUploads.filter((job) => job.status !== "error");

  // The item changed from outside this editor (saved here, or featured on/off in the Featured tab):
  // follow it, keeping any unsaved edits made here.
  const previousBaseline = useRef(baseline);
  useEffect(() => {
    const before = previousBaseline.current;
    if (before === baseline) return;
    previousBaseline.current = baseline;
    setDraft((current) => (sameDraft(current, before) ? baseline : { ...current, featured: baseline.featured }));
  }, [baseline]);

  const dirty = !sameDraft(draft, baseline);
  useEffect(() => onDirtyChange(item.id, dirty || pendingUploads.length > 0), [item.id, dirty, pendingUploads.length, onDirtyChange]);
  useEffect(() => () => onDirtyChange(item.id, false), [item.id, onDirtyChange]);

  useEffect(() => {
    root.current?.querySelector<HTMLInputElement>("input[name=title]")?.focus({ preventScroll: true });
    root.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (status.kind === "saved" || status.kind === "error") setStatus({ kind: "idle" });
  }

  function changeDate(date: string) {
    setDraft((current) => {
      const yearFollowedDate = !current.year || current.year === current.date.slice(0, 4);
      return { ...current, date, year: yearFollowedDate && /^\d{4}-/.test(date) ? date.slice(0, 4) : current.year };
    });
  }

  function addFiles(files: File[]) {
    const current = draftRef.current;
    const target: UploadTarget = {
      kind: "portfolio",
      category: current.category,
      year: isValidYear(current.year) ? current.year : String(new Date().getFullYear())
    };
    const { skipped } = uploads.add(files, target);
    if (skipped.length) notify(`Skipped (not images): ${skipped.join(", ")}`, "bad");
  }

  async function save() {
    if (busy) return;
    if (uploading.length) {
      setStatus({ kind: "error", message: "Wait for the uploads to finish, then save." });
      return;
    }
    if (!draft.title.trim()) return setStatus({ kind: "error", message: "Give it a title." });
    if (!isValidYear(draft.year)) return setStatus({ kind: "error", message: "Year must be 4 digits, like 2024." });
    if (!isValidDate(draft.date)) return setStatus({ kind: "error", message: "That date isn't a real date." });
    if (draft.gallery.length === 0) return setStatus({ kind: "error", message: "An item needs at least one image." });

    setBusy(true);
    setStatus({ kind: "saving" });
    try {
      const result = await api<{ item: AdminItem; files: DeleteSummary | null }>(`/api/admin/items/${item.id}`, {
        method: "PATCH",
        body: {
          expectedUpdatedAt: item.updatedAt,
          title: draft.title,
          date: draft.date,
          year: draft.year,
          category: draft.category,
          artType: draft.category === "arts" ? draft.artType : null,
          reviewType: draft.category === "reviews" ? draft.reviewType : null,
          note: draft.note,
          gallery: draft.gallery,
          coverSrc: draft.coverSrc,
          featured: draft.featured,
          deleteRemoved: Array.from(pendingDeletes.current)
        }
      });
      newUploads.current.clear();
      pendingDeletes.current.clear();
      setDraft(draftOf(result.item));
      onSaved(result.item);
      setStatus({ kind: "saved", at: clock(), note: describeFiles(result.files) });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  }

  useSaveShortcut(active, () => void save());

  // Uploaded during this edit but never saved: delete them again so they don't sit in Cloudinary unused.
  async function discardNewUploads(publicIds: string[]) {
    if (!publicIds.length) return;
    try {
      await api("/api/admin/uploads/discard", { method: "POST", body: { publicIds } });
    } catch {
      notify("Couldn't clean up the unsaved uploads in Cloudinary (they stay there unused).", "bad");
    }
  }

  function discard() {
    const unsaved = draft.gallery
      .map((image) => image.cloudinaryPublicId)
      .filter((id): id is string => Boolean(id && newUploads.current.has(id)));
    void discardNewUploads(unsaved);
    newUploads.current.clear();
    pendingDeletes.current.clear();
    uploads.clear();
    setDraft(baseline);
    setStatus({ kind: "idle" });
  }

  function requestClose() {
    if (dirty || pendingUploads.length) setConfirmClose(true);
    else onClose();
  }

  function removeImage(image: GalleryImage, alsoDeleteFile: boolean) {
    const id = image.cloudinaryPublicId;
    setDraft((current) => {
      const gallery = current.gallery.filter((entry) => entry.src !== image.src);
      return { ...current, gallery, coverSrc: current.coverSrc === image.src ? gallery[0]?.src ?? "" : current.coverSrc };
    });
    if (id && newUploads.current.has(id)) {
      newUploads.current.delete(id);
      if (alsoDeleteFile) void discardNewUploads([id]);
    } else if (id && alsoDeleteFile) {
      pendingDeletes.current.add(id);
    }
    setRemoving(null);
  }

  async function deleteItem() {
    setBusy(true);
    try {
      const result = await api<{ files: DeleteSummary | null }>(`/api/admin/items/${item.id}`, {
        method: "DELETE",
        body: { deleteFiles }
      });
      setDeleting(false);
      onDeleted(item.id, result.files);
    } catch (error) {
      setDeleting(false);
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Delete failed." });
    } finally {
      setBusy(false);
    }
  }

  // Hide / show right away, on its own: unsaved edits stay in the editor.
  async function setHidden(hidden: boolean) {
    setBusy(true);
    try {
      const result = await api<{ item: AdminItem }>(`/api/admin/items/${item.id}`, { method: "PATCH", body: { hidden } });
      onSaved(result.item);
      notify(hidden ? "Hidden. It stays here with its images, off the site. Show it again any time." : "Back on the site.", "ok");
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "That didn't save." });
    } finally {
      setBusy(false);
    }
  }

  const removingCanDelete = removing ? isUnderFolder(removing.cloudinaryPublicId, cloudinaryRoot) : false;
  const shownStatus: SaveStatus = status.kind === "idle" && dirty ? { kind: "dirty" } : status;

  return (
    <div
      ref={root}
      className="border-t border-[var(--a-line)] bg-[var(--a-panel)]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !removing && !deleting && !confirmClose && !event.defaultPrevented) {
          event.preventDefault();
          requestClose();
        }
      }}
    >
      <div className="grid gap-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10.5rem_7rem]">
          <label className="block min-w-0">
            <span className="a-label">Title</span>
            <input name="title" value={draft.title} onChange={(event) => set("title", event.target.value)} />
          </label>
          <label className="block min-w-0">
            <span className="a-label">Date</span>
            <input type="date" value={draft.date} onChange={(event) => changeDate(event.target.value)} />
          </label>
          <label className="block min-w-0">
            <span className="a-label">Year</span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={draft.year}
              onChange={(event) => set("year", event.target.value.replace(/\D/g, "").slice(0, 4))}
              aria-invalid={!isValidYear(draft.year)}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <Segmented
            label="Category"
            value={draft.category}
            options={CATEGORY_OPTIONS.map((option) => ({ ...option }))}
            onChange={(value) => set("category", value)}
          />
          {draft.category === "arts" ? (
            <Segmented
              label="Art type"
              value={draft.artType}
              options={artTypes.map((value) => ({ value, label: value }))}
              onChange={(value) => set("artType", value)}
            />
          ) : null}
          {draft.category === "reviews" ? (
            <Segmented
              label="Review type"
              value={draft.reviewType}
              options={reviewTypes.map((value) => ({ value, label: value }))}
              onChange={(value) => set("reviewType", value)}
            />
          ) : null}
        </div>

        <label className="block">
          <span className="a-label">Note</span>
          <textarea
            rows={Math.min(14, Math.max(3, draft.note.split("\n").length + 1))}
            value={draft.note}
            onChange={(event) => set("note", event.target.value)}
            className="resize-y leading-relaxed"
          />
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={draft.featured} onChange={(event) => set("featured", event.target.checked)} />
          <span>
            Featured on the homepage{" "}
            <span className="text-[var(--a-muted)]">(order it in the Featured tab)</span>
          </span>
        </label>

        <section aria-label="Images">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="a-label !mb-0">Images ({draft.gallery.length})</h3>
            <p className="text-xs text-[var(--a-faint)]">Drag to reorder · the cover shows first on the site</p>
          </div>
          <ImageGrid
            images={draft.gallery}
            coverSrc={draft.coverSrc}
            uploads={uploads.jobs}
            onReorder={(gallery) => set("gallery", gallery)}
            onCover={(src) => set("coverSrc", src)}
            onRemove={(image) => {
              if (draft.gallery.length === 1) {
                setStatus({ kind: "error", message: "An item needs at least one image. Add another first, or delete the item." });
                return;
              }
              setRemoving(image);
            }}
            onAddFiles={addFiles}
            onRetryUpload={uploads.retry}
            onDismissUpload={uploads.remove}
          />
        </section>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--a-line)] bg-[var(--a-panel)] px-4 py-3 sm:px-6">
        <button type="button" className="a-btn a-btn--primary" onClick={() => void save()} disabled={busy || (!dirty && pendingUploads.length === 0)}>
          {status.kind === "saving" ? "Saving…" : "Save"}
        </button>
        <button type="button" className="a-btn" onClick={discard} disabled={busy || (!dirty && pendingUploads.length === 0)}>
          Discard
        </button>
        <button type="button" className="a-btn a-btn--ghost" onClick={requestClose}>
          Close
        </button>
        <div className="min-w-0 flex-1 basis-40">
          <SaveState state={shownStatus} />
        </div>
        <button
          type="button"
          className="a-btn"
          onClick={() => void setHidden(!item.hidden)}
          disabled={busy}
          title={item.hidden ? "Put it back on the site" : "Take it off the site but keep it here"}
        >
          {item.hidden ? "Show on site" : "Hide from site"}
        </button>
        <button type="button" className="a-btn a-btn--danger" onClick={() => setDeleting(true)} disabled={busy}>
          Delete item
        </button>
      </div>

      <Dialog open={removing !== null} title="Remove this image?" onClose={() => setRemoving(null)}>
        <p>It comes out of this item when you save.</p>
        {!removingCanDelete ? (
          <p className="mt-2">
            The file is outside this deploy&apos;s Cloudinary folder ({cloudinaryRoot}/), so it can only be removed from the item.
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          {removingCanDelete ? (
            <button type="button" className="a-btn a-btn--danger" onClick={() => removing && removeImage(removing, true)}>
              Remove and delete the file
            </button>
          ) : null}
          <button type="button" className="a-btn" onClick={() => removing && removeImage(removing, false)}>
            Remove from item only
          </button>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => setRemoving(null)}>
            Cancel
          </button>
        </div>
      </Dialog>

      <Dialog open={deleting} title={`Delete “${item.title || "Untitled"}”?`} onClose={() => setDeleting(false)}>
        <p>The item leaves the site right away. This can&apos;t be undone.</p>
        <label className="mt-4 flex items-start gap-3 text-[var(--a-fg)]">
          <input type="checkbox" className="mt-0.5" checked={deleteFiles} onChange={(event) => setDeleteFiles(event.target.checked)} />
          <span>
            Also delete its {item.gallery.length} image{item.gallery.length === 1 ? "" : "s"} from Cloudinary
            <span className="block text-xs text-[var(--a-muted)]">
              Files outside {cloudinaryRoot}/ or still used by another item or post are kept.
            </span>
          </span>
        </label>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="a-btn a-btn--danger" onClick={() => void deleteItem()} disabled={busy}>
            {busy ? "Deleting…" : "Delete item"}
          </button>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => setDeleting(false)}>
            Cancel
          </button>
        </div>
      </Dialog>

      <Dialog open={confirmClose} title="Discard unsaved changes?" onClose={() => setConfirmClose(false)}>
        <p>Your edits to this item haven&apos;t been saved.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="a-btn a-btn--primary"
            onClick={() => {
              setConfirmClose(false);
              void save();
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="a-btn a-btn--danger"
            onClick={() => {
              discard();
              setConfirmClose(false);
              onClose();
            }}
          >
            Discard and close
          </button>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => setConfirmClose(false)}>
            Keep editing
          </button>
        </div>
      </Dialog>
    </div>
  );
}
