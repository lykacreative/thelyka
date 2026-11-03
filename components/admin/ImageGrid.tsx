"use client";

import { useRef, useState } from "react";
import type { GalleryImage } from "@/lib/item-rules";
import type { UploadJob } from "@/components/admin/useUploadQueue";
import { Thumb, hasFiles } from "@/components/admin/ui";
import { formatBytes } from "@/lib/admin-client";

type ImageGridProps = {
  images: GalleryImage[];
  coverSrc: string | null;
  uploads: UploadJob[];
  onReorder: (images: GalleryImage[]) => void;
  onCover?: (src: string) => void;
  onRemove: (image: GalleryImage) => void;
  onAddFiles: (files: File[]) => void;
  onRetryUpload: (key: string) => void;
  onDismissUpload: (key: string) => void;
  addLabel?: string;
};

function move<T>(list: T[], from: number, to: number) {
  const next = list.slice();
  const [entry] = next.splice(from, 1);
  next.splice(to, 0, entry);
  return next;
}

// An item's images: drag to reorder (or the arrow buttons / Alt+arrow keys), pick the cover, remove one,
// and add more (drop files here or pick them). Uploads in progress show as tiles with their own progress.
export function ImageGrid({
  images,
  coverSrc,
  uploads,
  onReorder,
  onCover,
  onRemove,
  onAddFiles,
  onRetryUpload,
  onDismissUpload,
  addLabel = "Add images"
}: ImageGridProps) {
  const dragFrom = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pending = uploads.filter((job) => job.status !== "done");

  return (
    <div
      className={`rounded-lg ${fileOver ? "a-drop-active" : ""}`}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setFileOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFileOver(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setFileOver(false);
        onAddFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => {
          const isCover = image.src === coverSrc;
          return (
            <li
              key={image.src}
              draggable
              onDragStart={(event) => {
                dragFrom.current = index;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(index));
              }}
              onDragOver={(event) => {
                if (dragFrom.current === null) return;
                event.preventDefault();
                setDropTarget(index);
              }}
              onDragLeave={() => setDropTarget((current) => (current === index ? null : current))}
              onDrop={(event) => {
                if (dragFrom.current === null) return;
                event.preventDefault();
                const from = dragFrom.current;
                dragFrom.current = null;
                setDropTarget(null);
                if (from !== index) onReorder(move(images, from, index));
              }}
              onDragEnd={() => {
                dragFrom.current = null;
                setDropTarget(null);
              }}
              className={`group relative flex min-w-0 flex-col overflow-hidden rounded-md border bg-[var(--a-panel)] ${
                dropTarget === index ? "border-[var(--a-accent)]" : isCover ? "border-[var(--a-muted)]" : "border-[var(--a-line)]"
              }`}
            >
              <div
                tabIndex={0}
                aria-label={`Image ${index + 1} of ${images.length}${isCover ? ", cover" : ""}. Alt+arrow keys move it.`}
                onKeyDown={(event) => {
                  if (!event.altKey) return;
                  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    if (index > 0) onReorder(move(images, index, index - 1));
                  } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    if (index < images.length - 1) onReorder(move(images, index, index + 1));
                  }
                }}
                className="relative aspect-square cursor-grab overflow-hidden bg-[#0a0a0a] active:cursor-grabbing"
              >
                <Thumb src={image.src} size={220} fill={false} className="absolute inset-0 h-full w-full object-contain" />
                <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] tabular-nums text-[var(--a-fg)]">
                  {index + 1}
                </span>
                {isCover ? (
                  <span className="absolute right-1.5 top-1.5 rounded bg-[var(--a-accent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--a-accent-ink)]">
                    Cover
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-1 border-t border-[var(--a-line)] p-1">
                <span className="flex">
                  <button
                    type="button"
                    className="a-btn a-btn--ghost a-btn--small min-w-9 !px-2"
                    aria-label="Move earlier"
                    disabled={index === 0}
                    onClick={() => onReorder(move(images, index, index - 1))}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="a-btn a-btn--ghost a-btn--small min-w-9 !px-2"
                    aria-label="Move later"
                    disabled={index === images.length - 1}
                    onClick={() => onReorder(move(images, index, index + 1))}
                  >
                    →
                  </button>
                </span>
                <span className="ml-auto flex">
                  {onCover && !isCover ? (
                    <button type="button" className="a-btn a-btn--ghost a-btn--small !px-2" onClick={() => onCover(image.src)}>
                      Cover
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="a-btn a-btn--ghost a-btn--small !px-2 !text-[var(--a-bad)]"
                    onClick={() => onRemove(image)}
                    aria-label={`Remove image ${index + 1}`}
                  >
                    Remove
                  </button>
                </span>
              </div>
            </li>
          );
        })}

        {pending.map((job) => (
          <li key={job.key} className="flex min-w-0 flex-col overflow-hidden rounded-md border border-dashed border-[var(--a-line-strong)] bg-[var(--a-panel)]">
            <div className="relative aspect-square overflow-hidden bg-[#0a0a0a]">
              {/* Local preview of the file being uploaded (not sent anywhere, not re-encoded). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={job.previewUrl} alt="" className="absolute inset-0 h-full w-full object-contain opacity-60" />
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/60">
                <div
                  className="h-full bg-[var(--a-accent)] transition-[width]"
                  style={{ width: `${Math.round(job.progress * 100)}%` }}
                />
              </div>
            </div>
            <div className="space-y-1 p-2 text-xs">
              <p className="truncate" title={job.name}>
                {job.name}
              </p>
              {job.status === "error" ? (
                <>
                  <p className="break-words text-[var(--a-bad)]">{job.error}</p>
                  <div className="flex gap-1">
                    <button type="button" className="a-btn a-btn--small" onClick={() => onRetryUpload(job.key)}>
                      Retry
                    </button>
                    <button type="button" className="a-btn a-btn--small a-btn--ghost" onClick={() => onDismissUpload(job.key)}>
                      Dismiss
                    </button>
                  </div>
                </>
              ) : (
                <p className="tabular-nums text-[var(--a-muted)]">
                  {job.status === "queued" ? "Waiting…" : `${Math.round(job.progress * 100)}%`} · {formatBytes(job.size)}
                </p>
              )}
            </div>
          </li>
        ))}

        <li className="min-w-0">
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[var(--a-line-strong)] p-3 text-center text-sm text-[var(--a-muted)] transition hover:border-[var(--a-muted)] hover:text-[var(--a-fg)]"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              +
            </span>
            {addLabel}
            <span className="text-xs text-[var(--a-faint)]">or drop files here</span>
          </button>
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) onAddFiles(files);
            }}
          />
        </li>
      </ul>
    </div>
  );
}
