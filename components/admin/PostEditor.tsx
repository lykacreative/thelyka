"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { BlogRenderer } from "@/components/BlogRenderer";
import { api, todayIso, titleFromFileName } from "@/lib/admin-client";
import { imageUrlsInMarkdown, isValidSlug, slugify } from "@/lib/blog-slug";
import type { AdminPost, DeleteSummary } from "@/lib/admin-types";
import { useUploadQueue } from "@/components/admin/useUploadQueue";
import {
  Dialog,
  SaveState,
  Thumb,
  clock,
  describeFiles,
  hasFiles,
  useSaveShortcut,
  useToast,
  type SaveStatus
} from "@/components/admin/ui";

type Draft = { title: string; slug: string; date: string; excerpt: string; cover: string; content: string };

function draftOf(post: AdminPost | null): Draft {
  return post
    ? { title: post.title, slug: post.slug, date: post.date, excerpt: post.excerpt, cover: post.cover, content: post.content }
    : { title: "", slug: "", date: todayIso(), excerpt: "", cover: "", content: "" };
}

function same(a: Draft, b: Draft) {
  return a.title === b.title && a.slug === b.slug && a.date === b.date && a.excerpt === b.excerpt && a.cover === b.cover && a.content === b.content;
}

const marker = (key: string) => `(uploading:${key})`;

type UploadMode = "image" | "split-left" | "split-right" | "cover";

type PostEditorProps = {
  post: AdminPost | null;
  active: boolean;
  onSaved: (post: AdminPost, wasNew: boolean) => void;
  onDeleted: (id: string, files: DeleteSummary | null) => void;
  onDirtyChange: (dirty: boolean) => void;
};

// Write on the left, the post exactly as the live page shows it on the right (the site's own BlogRenderer
// and CSS). Images go straight to Cloudinary and land in the text where the cursor is.
export function PostEditor({ post, active, onSaved, onDeleted, onDirtyChange }: PostEditorProps) {
  const notify = useToast();
  const baseline = useMemo(() => draftOf(post), [post]);
  const [draft, setDraft] = useState<Draft>(baseline);
  const [slugTouched, setSlugTouched] = useState(post !== null);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"write" | "preview">("write");
  const [deleting, setDeleting] = useState(false);
  const [deleteImages, setDeleteImages] = useState(false);
  const [coverPicker, setCoverPicker] = useState(false);
  const [fileOver, setFileOver] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadMode = useRef<UploadMode>("image");
  const coverJobs = useRef(new Set<string>());
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const uploads = useUploadQueue({
    onUploaded: (job, image) => {
      const alt = titleFromFileName(job.name);
      if (coverJobs.current.has(job.key)) {
        coverJobs.current.delete(job.key);
        setDraft((current) => ({ ...current, cover: image.src }));
      } else {
        setDraft((current) => ({ ...current, content: current.content.split(`![Uploading ${job.name}…]${marker(job.key)}`).join(`![${alt}](${image.src})`) }));
      }
      uploads.remove(job.key);
    }
  });

  // Failed uploads: take their placeholder out of the text and say why.
  useEffect(() => {
    for (const job of uploads.jobs) {
      if (job.status !== "error") continue;
      if (!coverJobs.current.delete(job.key)) {
        setDraft((current) => ({
          ...current,
          content: current.content.split(`![Uploading ${job.name}…]${marker(job.key)}`).join("")
        }));
      }
      notify(`${job.name}: ${job.error}`, "bad");
      uploads.remove(job.key);
    }
  }, [uploads.jobs, uploads.remove, notify]);

  const pendingUploads = uploads.jobs.filter((job) => job.status !== "done").length;
  const dirty = !same(draft, baseline);
  useEffect(() => onDirtyChange(dirty || pendingUploads > 0), [dirty, pendingUploads, onDirtyChange]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);

  const previewDraft = useDeferredValue(draft);
  const imagesInPost = useMemo(() => imageUrlsInMarkdown(draft.content), [draft.content]);
  const year = /^\d{4}/.test(draft.date) ? draft.date.slice(0, 4) : String(new Date().getFullYear());

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (status.kind === "saved" || status.kind === "error") setStatus({ kind: "idle" });
  }

  function setTitle(title: string) {
    setDraft((current) => ({ ...current, title, slug: slugTouched ? current.slug : slugify(title) }));
  }

  // Put text where the cursor is (or replace the selection) and leave the cursor after it.
  function insert(text: string, { block = false, select }: { block?: boolean; select?: [number, number] } = {}) {
    const element = textarea.current;
    const content = draftRef.current.content;
    const start = element ? element.selectionStart : content.length;
    const end = element ? element.selectionEnd : content.length;
    const before = content.slice(0, start);
    const after = content.slice(end);
    let piece = text;
    if (block) {
      if (before && !before.endsWith("\n\n")) piece = (before.endsWith("\n") ? "\n" : "\n\n") + piece;
      if (after && !after.startsWith("\n\n")) piece = piece + (after.startsWith("\n") ? "\n" : "\n\n");
      else if (!after) piece = `${piece}\n`;
    }
    const next = before + piece + after;
    setDraft((current) => ({ ...current, content: next }));
    const caret = before.length + piece.length;
    requestAnimationFrame(() => {
      if (!element) return;
      element.focus();
      if (select) element.setSelectionRange(before.length + select[0], before.length + select[1]);
      else element.setSelectionRange(caret, caret);
    });
  }

  function wrap(left: string, right: string, placeholder: string) {
    const element = textarea.current;
    const content = draftRef.current.content;
    const start = element?.selectionStart ?? content.length;
    const end = element?.selectionEnd ?? content.length;
    const selected = content.slice(start, end) || placeholder;
    insert(`${left}${selected}${right}`, { select: [left.length, left.length + selected.length] });
  }

  function uploadFiles(files: File[], mode: UploadMode) {
    if (!files.length) return;
    const { skipped, added } = uploads.add(mode === "cover" ? files.slice(0, 1) : files, { kind: "blog", year });
    if (skipped.length) notify(`Skipped (not images): ${skipped.join(", ")}`, "bad");
    if (!added.length) return;
    if (mode === "cover") {
      coverJobs.current.add(added[0].key);
      setCoverPicker(false);
      return;
    }
    const images = added.map((job) => `![Uploading ${job.name}…]${marker(job.key)}`);
    if (mode === "image") {
      insert(images.join("\n\n"), { block: true });
    } else {
      const side = mode === "split-right" ? "split right" : "split";
      insert(`:::${side}\n${images[0]}\n:::\nText beside the image.\n:::`, { block: true });
      if (images.length > 1) notify("Image + text takes one picture; the first file was used.", "info");
    }
  }

  function pick(mode: UploadMode) {
    uploadMode.current = mode;
    fileInput.current?.click();
  }

  async function save() {
    if (busy) return;
    if (pendingUploads) return setStatus({ kind: "error", message: "Wait for the image uploads to finish, then save." });
    if (!draft.title.trim()) return setStatus({ kind: "error", message: "Give the post a title." });
    const slug = draft.slug || slugify(draft.title);
    if (!isValidSlug(slug)) return setStatus({ kind: "error", message: "The address can only use a-z, 0-9 and single dashes." });
    if (!draft.date) return setStatus({ kind: "error", message: "Pick the post's date." });
    if (!draft.content.trim()) return setStatus({ kind: "error", message: "The post has no text yet." });

    setBusy(true);
    setStatus({ kind: "saving" });
    try {
      const body = { ...draft, slug, expectedUpdatedAt: post?.updatedAt };
      const result = post
        ? await api<{ post: AdminPost; redirectedFrom: string | null }>(`/api/admin/posts/${post.id}`, { method: "PATCH", body })
        : await api<{ post: AdminPost }>("/api/admin/posts", { method: "POST", body });
      const redirectedFrom = "redirectedFrom" in result ? result.redirectedFrom : null;
      setDraft(draftOf(result.post));
      setSlugTouched(true);
      onSaved(result.post, post === null);
      setStatus({
        kind: "saved",
        at: clock(),
        note: `Live at /blogs/${result.post.slug}.${redirectedFrom ? ` /blogs/${redirectedFrom} now redirects here.` : ""}`
      });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Save failed." });
    } finally {
      setBusy(false);
    }
  }

  useSaveShortcut(active, () => void save());

  async function deletePost() {
    if (!post) return;
    setBusy(true);
    try {
      const result = await api<{ files: DeleteSummary | null }>(`/api/admin/posts/${post.id}`, { method: "DELETE", body: { deleteImages } });
      setDeleting(false);
      onDeleted(post.id, result.files);
    } catch (error) {
      setDeleting(false);
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Delete failed." });
    } finally {
      setBusy(false);
    }
  }

  const shownStatus: SaveStatus =
    status.kind === "idle" && pendingUploads
      ? { kind: "working", message: `Uploading ${pendingUploads} image${pendingUploads === 1 ? "" : "s"}…` }
      : status.kind === "idle" && dirty
        ? { kind: "dirty" }
        : status;

  const toolbar: { label: string; title: string; run: () => void }[] = [
    { label: "Image", title: "Upload images into the text at the cursor (full width)", run: () => pick("image") },
    { label: "Image | text", title: "Image on the left, text on the right (stacks on phones)", run: () => pick("split-left") },
    { label: "Text | image", title: "Text on the left, image on the right", run: () => pick("split-right") },
    { label: "H2", title: "Heading", run: () => insert("## Heading", { block: true, select: [3, 10] }) },
    { label: "B", title: "Bold", run: () => wrap("**", "**", "bold text") },
    { label: "I", title: "Italic", run: () => wrap("*", "*", "italic text") },
    { label: "Link", title: "Link", run: () => wrap("[", "](https://)", "link text") },
    { label: "Quote", title: "Quote", run: () => insert("> Quote", { block: true, select: [2, 7] }) }
  ];

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10.5rem]">
        <label className="block min-w-0">
          <span className="a-label">Title</span>
          <input value={draft.title} onChange={(event) => setTitle(event.target.value)} className="a-display !text-xl" />
        </label>
        <label className="block min-w-0">
          <span className="a-label">Date</span>
          <input type="date" value={draft.date} onChange={(event) => set("date", event.target.value)} />
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block min-w-0">
          <span className="a-label">Address</span>
          <span className="flex min-w-0 items-center rounded-md border border-[var(--a-line-strong)] bg-[var(--a-panel)] focus-within:outline focus-within:outline-2 focus-within:outline-[var(--a-focus)]">
            <span className="flex-none pl-3 text-sm text-[var(--a-faint)]">/blogs/</span>
            <input
              value={draft.slug}
              onChange={(event) => {
                setSlugTouched(true);
                set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              className="!border-0 !bg-transparent !pl-1 focus-visible:!outline-none"
              aria-describedby="slug-help"
            />
          </span>
          <span id="slug-help" className="mt-1 block text-xs text-[var(--a-faint)]">
            {post && draft.slug !== post.slug ? `Changing it keeps this post; /blogs/${post.slug} will redirect here.` : "a-z, 0-9 and dashes"}
          </span>
        </label>
        <div className="flex items-start pt-6">
          <button type="button" className="a-btn a-btn--small" onClick={() => set("slug", slugify(draft.title))} disabled={!draft.title}>
            From title
          </button>
        </div>
      </div>

      <label className="mt-4 block">
        <span className="a-label">Excerpt</span>
        <textarea rows={2} value={draft.excerpt} onChange={(event) => set("excerpt", event.target.value)} className="resize-y" />
      </label>

      <div className="mt-4">
        <span className="a-label">Cover</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="relative aspect-[16/9] w-40 flex-none overflow-hidden rounded border border-[var(--a-line)] bg-[var(--a-raise)]">
            {draft.cover ? <Thumb src={draft.cover} size={160} className="h-full w-full object-cover" alt="Cover" /> : null}
            {!draft.cover ? <span className="absolute inset-0 flex items-center justify-center text-xs text-[var(--a-faint)]">No cover</span> : null}
          </span>
          <button type="button" className="a-btn a-btn--small" onClick={() => setCoverPicker(true)}>
            Choose cover
          </button>
          {draft.cover ? (
            <button type="button" className="a-btn a-btn--small a-btn--ghost" onClick={() => set("cover", "")}>
              Remove cover
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex gap-1 rounded-lg border border-[var(--a-line)] p-1 lg:hidden" role="tablist" aria-label="Editor view">
        {(["write", "preview"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={view === option}
            onClick={() => setView(option)}
            className={`flex-1 rounded-md px-3 py-2 text-sm capitalize ${view === option ? "bg-[var(--a-fg)] text-[var(--a-bg)]" : "text-[var(--a-muted)]"}`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:mt-6 lg:grid-cols-2">
        <div className={`min-w-0 ${view === "write" ? "" : "hidden lg:block"}`}>
          <div className="flex flex-wrap gap-1 rounded-t-md border border-b-0 border-[var(--a-line-strong)] bg-[var(--a-raise)] p-1.5" role="toolbar" aria-label="Formatting">
            {toolbar.map((tool) => (
              <button key={tool.label} type="button" title={tool.title} className="a-btn a-btn--ghost a-btn--small" onClick={tool.run}>
                {tool.label}
              </button>
            ))}
          </div>
          <textarea
            ref={textarea}
            value={draft.content}
            onChange={(event) => set("content", event.target.value)}
            onPaste={(event) => {
              const files = Array.from(event.clipboardData.files);
              if (files.length) {
                event.preventDefault();
                uploadFiles(files, "image");
              }
            }}
            onDragOver={(event) => {
              if (!hasFiles(event)) return;
              event.preventDefault();
              setFileOver(true);
            }}
            onDragLeave={() => setFileOver(false)}
            onDrop={(event) => {
              if (!hasFiles(event)) return;
              event.preventDefault();
              setFileOver(false);
              uploadFiles(Array.from(event.dataTransfer.files), "image");
            }}
            spellCheck
            aria-label="Post text (Markdown)"
            placeholder={"Write here. Markdown works: ## heading, **bold**, *italic*, [link](https://...).\nDrop or paste images to put them where the cursor is."}
            className={`a-scroll-thin block min-h-[28rem] w-full resize-y !rounded-t-none font-mono !text-[13.5px] leading-relaxed lg:min-h-[40rem] ${fileOver ? "a-drop-active" : ""}`}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              uploadFiles(files, uploadMode.current);
            }}
          />
        </div>

        <div className={`min-w-0 ${view === "preview" ? "" : "hidden lg:block"}`}>
          <div className="a-post-preview a-scroll-thin overflow-hidden rounded-lg border border-[var(--a-line)] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
            <article className="mx-auto w-full max-w-[720px] px-5 pb-16 pt-10 sm:px-8">
              <header className="mb-10 border-b border-[var(--frame)] pb-8">
                <time className="font-sans text-xs font-medium uppercase tracking-normal text-[var(--page-fg)]/70">{previewDraft.date}</time>
                <h1 className="mt-3 font-display text-[32px] font-normal leading-[1.1] tracking-normal sm:text-[48px]">
                  {previewDraft.title || "Untitled"}
                </h1>
                {previewDraft.excerpt ? (
                  <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-[var(--page-fg)]/70">{previewDraft.excerpt}</p>
                ) : null}
              </header>
              {previewDraft.cover ? (
                <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden border border-[var(--frame)] bg-[var(--panel-bg)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewDraft.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="lyka-prose">
                <BlogRenderer content={previewDraft.content.replace(/!\[Uploading [^\]]*\]\(uploading:[^)]+\)/g, "*Uploading an image…*")} />
              </div>
            </article>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--a-line)] bg-[var(--a-bg)] py-3">
        <button type="button" className="a-btn a-btn--primary" onClick={() => void save()} disabled={busy || (!dirty && post !== null)}>
          {status.kind === "saving" ? "Saving…" : post ? "Save" : "Publish"}
        </button>
        {post ? (
          <button
            type="button"
            className="a-btn"
            onClick={() => {
              setDraft(baseline);
              setStatus({ kind: "idle" });
            }}
            disabled={busy || !dirty}
          >
            Discard
          </button>
        ) : null}
        {post ? (
          <a className="a-btn a-btn--ghost" href={`/blogs/${post.slug}`} target="_blank" rel="noreferrer">
            View live ↗
          </a>
        ) : null}
        <div className="min-w-0 flex-1 basis-48">
          <SaveState state={shownStatus} />
        </div>
        {post ? (
          <button type="button" className="a-btn a-btn--danger" onClick={() => setDeleting(true)} disabled={busy}>
            Delete post
          </button>
        ) : null}
      </div>

      <Dialog open={coverPicker} title="Choose the cover" onClose={() => setCoverPicker(false)}>
        {imagesInPost.length ? (
          <ul className="a-scroll-thin grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {imagesInPost.map((src) => (
              <li key={src}>
                <button
                  type="button"
                  onClick={() => {
                    set("cover", src);
                    setCoverPicker(false);
                  }}
                  className={`block aspect-[16/9] w-full overflow-hidden rounded border ${draft.cover === src ? "border-[var(--a-accent)]" : "border-[var(--a-line)]"}`}
                >
                  <Thumb src={src} size={160} className="h-full w-full object-cover" alt="Use as cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>No images in the post yet.</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="a-btn" onClick={() => pick("cover")}>
            Upload a cover
          </button>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => setCoverPicker(false)}>
            Close
          </button>
        </div>
      </Dialog>

      <Dialog open={deleting} title={`Delete “${post?.title ?? ""}”?`} onClose={() => setDeleting(false)}>
        <p>The post leaves the site right away. This can&apos;t be undone.</p>
        <label className="mt-4 flex items-start gap-3 text-[var(--a-fg)]">
          <input type="checkbox" className="mt-0.5" checked={deleteImages} onChange={(event) => setDeleteImages(event.target.checked)} />
          <span>
            Also delete its images from Cloudinary
            <span className="block text-xs text-[var(--a-muted)]">Images outside this deploy&apos;s folder or still used elsewhere are kept.</span>
          </span>
        </label>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="a-btn a-btn--danger" onClick={() => void deletePost()} disabled={busy}>
            {busy ? "Deleting…" : "Delete post"}
          </button>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => setDeleting(false)}>
            Cancel
          </button>
        </div>
      </Dialog>
    </div>
  );
}
