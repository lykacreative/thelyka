"use client";

import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FaEye,
  FaPenToSquare,
  FaPlus,
  FaTableColumns,
  FaTrashCan,
  FaUpload,
  FaXmark
} from "react-icons/fa6";
import { BlogPaneViewer } from "@/components/BlogPaneViewer";
import { BlogRenderer } from "@/components/BlogRenderer";

type BlogImage = {
  src: string;
  year: string;
  filename: string;
};

type ExistingPost = {
  slug: string;
  year: string;
  title: string;
  date: string;
  excerpt: string;
  cover: string;
  content: string;
  images: string[];
};

type BlogEditorProps = {
  allImages: BlogImage[];
  years: string[];
};

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "deleting" }
  | { kind: "uploading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

const emptyForm = {
  title: "",
  slug: "",
  date: new Date().toISOString().slice(0, 10),
  excerpt: "",
  content: "",
  year: new Date().getFullYear().toString(),
  cover: ""
};

function slugFromTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayYear() {
  return new Date().getFullYear().toString();
}

function resolveCoverField(
  value: string,
  year: string,
  localImages: { src: string; year: string; filename: string }[]
): string {
  if (!value) return "";
  if (value.startsWith("/media/")) return value;

  const trimmed = value.trim();
  if (!trimmed) return "";

  // Find the image by filename across all media
  const found = localImages.find((img) => img.filename === trimmed);
  if (found) {
    return found.src;
  }

  // Not found anywhere - return as-is (will just be a broken image until uploaded)
  return trimmed;
}

export function BlogEditor({ allImages, years }: BlogEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState({ ...emptyForm });
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [preview, setPreview] = useState(true);
  const [imageFilter, setImageFilter] = useState<string>("all");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [existingPosts, setExistingPosts] = useState<ExistingPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [paneOpen, setPaneOpen] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep a local copy of images so newly uploaded ones appear instantly
  const [localImages, setLocalImages] = useState(allImages);

  // Sync with server-provided images when they change
  useEffect(() => {
    setLocalImages(allImages);
  }, [allImages]);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadYear, setUploadYear] = useState(todayYear());

  const yearOptions = (() => {
    const set = new Set<string>(years);
    set.add(todayYear());
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  })();

  const filteredImages =
    imageFilter === "all" ? localImages : localImages.filter((img) => img.year === imageFilter);

  async function fetchPosts() {
    setLoadingPosts(true);
    try {
      const res = await fetch("/api/blogs");
      const data = (await res.json()) as { posts?: ExistingPost[] };
      setExistingPosts(data.posts ?? []);
    } catch {
      // ignore
    }
    setLoadingPosts(false);
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  function loadPost(post: ExistingPost) {
    setForm({
      title: post.title,
      slug: post.slug,
      date: post.date,
      excerpt: post.excerpt,
      content: post.content,
      year: post.year,
      cover: post.cover
    });
    setEditingSlug(post.slug);
    setSlugManuallyEdited(true);
    setStatus({ kind: "idle" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newPost() {
    setForm({ ...emptyForm });
    setEditingSlug(null);
    setSlugManuallyEdited(false);
    setStatus({ kind: "idle" });
  }

  function insertImage(src: string) {
    const markdown = `![image](${src})`;
    setForm((prev) => ({
      ...prev,
      content: prev.content + (prev.content ? "\n\n" : "") + markdown
    }));
  }

  function handleTitleChange(value: string) {
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: slugManuallyEdited ? prev.slug : slugFromTitle(value)
    }));
  }

  function openUpload() {
    setShowUpload(true);
    setUploadFile(null);
    setUploadPreview(null);
    setUploadYear(form.year || todayYear());
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
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

    if (!uploadFile) {
      setStatus({
        kind: "error",
        message: "Please choose an image file.",
      });
      return;
    }

    if (!uploadYear) {
      setStatus({
        kind: "error",
        message: "Year is required.",
      });
      return;
    }

    setStatus({ kind: "uploading" });

    const formData = new FormData();

    formData.append("file", uploadFile);
    formData.append("year", uploadYear);

    try {
      const response = await fetch("/api/blogs/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        filename?: string;
        year?: string;
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
        message: `Image uploaded: ${payload.filename ?? "done"}`,
      });

      // Optimistically add the new image to the local list
      if (payload.src && payload.filename) {
        const newImage = {
          src: payload.src,
          year: payload.year || form.year || todayYear(),
          filename: payload.filename,
        };
        setLocalImages((prev) => {
          const exists = prev.some(
            (img) => img.src === newImage.src || img.filename === newImage.filename
          );
          if (exists) return prev;
          return [...prev, newImage];
        });
      }

      // Populate the post form with the uploaded image so the cover
      // (or content) actually points at the file that was just saved.
      if (payload.filename) {
        setForm((prev) => ({
          ...prev,
          year: payload.year || prev.year,
          cover: prev.cover || payload.filename!
        }));
      }

      closeUpload();

      router.refresh();
    } catch (error) {
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Upload failed.",
      });
    }
  }

  function insertSplitLayout() {
    const year = form.year || todayYear();
    const template = `:::split
![image alt](/media/${year}/image.jpg)
:::
Write your text here. **Markdown** is supported.
:::`;

    const textarea = contentRef.current;
    if (!textarea) {
      setForm((prev) => ({
        ...prev,
        content: prev.content
          ? `${prev.content.replace(/\s*$/, "")}\n\n${template}\n`
          : `${template}\n`
      }));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = form.content.slice(0, start);
    const after = form.content.slice(end);
    const needsNewlineBefore = before.length > 0 && !before.endsWith("\n\n");
    const needsNewlineAfter = after.length > 0 && !after.startsWith("\n\n");
    const prefix = needsNewlineBefore ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const suffix = needsNewlineAfter ? (after.startsWith("\n") ? "\n" : "\n\n") : "";

    const newContent = `${before}${prefix}${template}${suffix}${after}`;
    setForm((prev) => ({ ...prev, content: newContent }));

    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      const cursor = before.length + prefix.length;
      const selectStart = cursor + ":::split\n![image alt](".length;
      const selectEnd = selectStart + `/media/${year}/image.jpg`.length;
      el.setSelectionRange(selectStart, selectEnd);
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      setStatus({ kind: "error", message: "Title, slug, and content are required." });
      return;
    }

    setStatus({ kind: "saving" });
    try {
      const rawCover = form.cover.trim();
      const resolvedCover = resolveCoverField(rawCover, form.year || todayYear(), localImages);

      const response = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug.trim(),
          title: form.title.trim(),
          date: form.date.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content,
          year: form.year.trim() || todayYear(),
          cover: resolvedCover || undefined
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setStatus({ kind: "error", message: payload.error ?? "Save failed." });
        return;
      }
      setStatus({ kind: "success", message: "Blog post saved." });
      setEditingSlug(form.slug.trim());
      fetchPosts();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Save failed." });
    }
  }

  async function handleDelete() {
    if (!form.slug.trim()) {
      setStatus({ kind: "error", message: "Enter a slug to delete." });
      return;
    }
    setStatus({ kind: "deleting" });
    try {
      const response = await fetch("/api/blogs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug.trim(),
          year: form.year.trim() || todayYear()
        })
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setStatus({ kind: "error", message: payload.error ?? "Delete failed." });
        return;
      }
      setStatus({ kind: "success", message: "Blog post deleted." });
      setForm({ ...emptyForm });
      setEditingSlug(null);
      fetchPosts();
      router.refresh();
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Delete failed." });
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Existing posts ── */}
      <section className="border border-[var(--frame)] bg-[var(--modal-bg)] p-5 text-[var(--modal-fg)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-normal tracking-normal">Existing posts</h3>
          <button
            type="button"
            onClick={newPost}
            className="inline-flex items-center gap-1.5 border border-[var(--frame)] bg-[var(--panel-bg)] px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90"
          >
            <FaPlus aria-hidden="true" className="h-2.5 w-2.5" />
            New post
          </button>
        </div>

        {loadingPosts ? (
          <p className="font-sans text-sm text-[var(--modal-fg)]/50">Loading…</p>
        ) : existingPosts.length === 0 ? (
          <p className="font-sans text-sm text-[var(--modal-fg)]/50">
            No posts yet. Create your first one above.
          </p>
        ) : (
          <ul className="grid max-h-[260px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {existingPosts.map((post) => (
              <li
                key={`${post.year}-${post.slug}`}
                className={`flex items-start justify-between gap-2 border p-3 transition ${
                  editingSlug === post.slug
                    ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                    : "border-[var(--frame)]/40 bg-[var(--page-bg-solid)] text-[var(--page-fg)] hover:border-[var(--frame)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => loadPost(post)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate font-display text-sm font-normal tracking-normal">
                    {post.title}
                  </span>
                  <span className="mt-0.5 block font-sans text-[10px] uppercase tracking-normal opacity-60">
                    {post.year} · {post.date}
                    {post.excerpt
                      ? ` · ${post.excerpt.slice(0, 30)}${post.excerpt.length > 30 ? "…" : ""}`
                      : ""}
                  </span>
                </button>
                <span
                  className="mt-0.5 flex shrink-0 items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => loadPost(post)}
                    className="grid h-6 w-6 place-items-center rounded transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
                    aria-label={`Edit ${post.title}`}
                  >
                    <FaPenToSquare aria-hidden="true" className="h-3 w-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          className="border border-[var(--frame)] bg-[var(--panel-bg)] px-4 py-1.5 font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90"
        >
          {preview ? "Hide preview" : "Show preview"}
        </button>
        <button
          type="button"
          onClick={() => setPaneOpen(true)}
          className="inline-flex items-center gap-1.5 border border-[var(--frame)] bg-[var(--panel-bg)] px-4 py-1.5 font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90"
        >
          <FaEye aria-hidden="true" className="h-3 w-3" />
          Pane view
        </button>
        {editingSlug ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={status.kind === "deleting"}
            className="border border-[var(--frame)] bg-transparent px-4 py-1.5 font-sans text-xs font-medium uppercase tracking-normal text-rose-700 transition hover:bg-rose-700 hover:text-white disabled:opacity-60"
          >
            {status.kind === "deleting" ? "Deleting…" : "Delete post"}
          </button>
        ) : null}
        {status.kind === "success" ? (
          <span className="font-sans text-xs tracking-normal text-emerald-700 dark:text-emerald-300">
            {status.message}
          </span>
        ) : null}
        {status.kind === "error" ? (
          <span className="font-sans text-xs tracking-normal text-rose-700 dark:text-rose-300">
            {status.message}
          </span>
        ) : null}
      </div>

      {/* ── Editor + Preview ── */}
      <div className={`grid gap-6 ${preview ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : ""}`}>
        <form
          onSubmit={handleSave}
          className="space-y-4 border border-[var(--frame)] bg-[var(--modal-bg)] p-5 text-[var(--modal-fg)]"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-xl font-normal tracking-normal">
              {editingSlug ? "Edit post" : "New post"}
            </h3>
            <button
              type="button"
              onClick={() => setPaneOpen(true)}
              className="inline-flex items-center gap-1.5 border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
              title="Open pane view to see how this post looks on its own page"
            >
              <FaEye aria-hidden="true" className="h-3 w-3" />
              Pane view
            </button>
          </div>

         <div>
          <label className="block">
            <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
              Year
            </span>

            <select
              value={form.year}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  year: e.target.value,
                }))
              }
              className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)]"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
              Title
            </span>
            <input
              type="text"
              value={form.title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="My new post"
              className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-2 font-display text-base tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
              Slug
            </span>
            <input
              type="text"
              value={form.slug}
              onChange={(event) => {
                setSlugManuallyEdited(true);
                setForm({ ...form, slug: event.target.value });
              }}
              placeholder="my-post-slug"
              className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-2 font-display text-base tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
              required
            />
          </label>
        </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                Date
              </span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
                className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-2 font-display text-base tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                Year folder
              </span>
              <select
                value={form.year}
                onChange={(event) => setForm({ ...form, year: event.target.value })}
                className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-2 font-display text-base tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                Cover image
              </span>
              <input
                type="text"
                value={form.cover}
                onChange={(event) => setForm({ ...form, cover: event.target.value })}
                placeholder="cover.jpg"
                className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-2 font-display text-base tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
              Excerpt
            </span>
            <input
              type="text"
              value={form.excerpt}
              onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
              placeholder="A short summary shown on the listing page."
              className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-2 font-display text-base tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
            />
          </label>

          <label className="block">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="block font-sans text-[10px] font-medium uppercase tracking-normal">
                Content (Markdown)
              </span>
              <button
                type="button"
                onClick={insertSplitLayout}
                className="inline-flex items-center gap-1.5 border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2.5 py-0.5 font-sans text-[10px] font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
                title="Insert a 50/50 image + text block. Stacks vertically on mobile, sits side-by-side on larger screens."
              >
                <FaTableColumns aria-hidden="true" className="h-3 w-3" />
                Insert 50/50 split
              </button>
            </div>
            <textarea
              ref={contentRef}
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              rows={16}
              placeholder={`Write your blog post in markdown here.\n\nFor a 50/50 image + text layout, use:\n:::split\n![alt](/media/2025/image.jpg)\n:::\nYour text here. Markdown is supported.\n:::\n\nClick "Insert 50/50 split" above to drop one in automatically.`}
              className="w-full resize-y border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-2 font-mono text-sm tracking-normal text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
              required
            />
          </label>

          <button
            type="submit"
            disabled={status.kind === "saving"}
            className="w-full border border-[var(--frame)] bg-[var(--panel-bg)] px-5 py-2 font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90 disabled:opacity-60"
          >
            {status.kind === "saving" ? "Saving…" : editingSlug ? "Update post" : "Save post"}
          </button>
        </form>

        {preview ? (
          <div className="border border-[var(--frame)] bg-[var(--modal-bg)] p-5 text-[var(--modal-fg)]">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="font-display text-xl font-normal tracking-normal">Preview</h3>
              <button
                type="button"
                onClick={() => setPaneOpen(true)}
                className="inline-flex items-center gap-1.5 border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
                title="Open pane view to see how this post looks on its own page"
              >
                <FaEye aria-hidden="true" className="h-3 w-3" />
                Pane view
              </button>
            </div>
            <div className="max-h-[700px] overflow-y-auto">
              {form.title || form.content ? (
                <article onContextMenu={(event) => event.preventDefault()}>
                  <header className="mb-6 border-b border-[var(--frame)] pb-6">
                    {form.date ? (
                      <time className="font-sans text-xs font-medium uppercase tracking-normal text-[var(--page-fg)]/70">
                        {form.date}
                      </time>
                    ) : null}
                    {form.title ? (
                      <h2 className="mt-2 font-display text-[28px] font-normal leading-[1.1] tracking-normal sm:text-[40px]">
                        {form.title}
                      </h2>
                    ) : null}
                    {form.excerpt ? (
                      <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-[var(--page-fg)]/70">
                        {form.excerpt}
                      </p>
                    ) : null}
                  </header>

                  {form.cover ? (
                    <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden border border-[var(--frame)] bg-[var(--panel-bg)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveCoverField(form.cover, form.year || todayYear(), localImages)}
                        alt={form.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="lyka-prose">
                    <BlogRenderer content={form.content} />
                  </div>
                </article>
              ) : (
                <p className="font-sans text-sm text-[var(--modal-fg)]/50">
                  Start writing to see a preview.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Available images ── */}
      <section className="border border-[var(--frame)] bg-[var(--modal-bg)] p-5 text-[var(--modal-fg)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-xl font-normal tracking-normal">Available images</h3>

          <div className="flex items-center gap-2">
            {/* UPLOAD BUTTON */}
            <button
              type="button"
              onClick={openUpload}
              className="inline-flex items-center gap-1.5 border border-[var(--frame)] bg-[var(--panel-bg)] px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--panel-fg)] transition hover:opacity-90"
            >
              <FaUpload className="h-3 w-3" />
              Upload image
            </button>

            <button
              type="button"
              onClick={() => setPaneOpen(true)}
              className="inline-flex items-center gap-1.5 border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-1 font-sans text-[10px] font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
              title="Open pane view to see how this post looks on its own page"
            >
              <FaEye aria-hidden="true" className="h-3 w-3" />
              Pane view
            </button>
          </div>
        </div>

        <p className="mb-4 font-sans text-xs tracking-normal text-[var(--modal-fg)]/60">
          Upload images directly or place them in{" "}
          <code className="rounded bg-[var(--panel-bg)] px-1 py-0.5 text-[var(--panel-fg)]">
            public/media/&lt;year&gt;/
          </code>
          . Click an image to insert it into your content.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setImageFilter("all")}
            className={`border px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal transition ${
              imageFilter === "all"
                ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                : "border-[var(--frame)] bg-transparent text-[var(--modal-fg)] hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
            }`}
          >
            All
          </button>
          {yearOptions.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setImageFilter(y)}
              className={`border px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal transition ${
                imageFilter === y
                  ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                  : "border-[var(--frame)] bg-transparent text-[var(--modal-fg)] hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
              }`}
            >
              {y}
            </button>
          ))}
        </div>

        {filteredImages.length > 0 ? (
          <div className="grid max-h-[300px] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6 lg:grid-cols-8">
            {filteredImages.map((img) => (
              <button
                key={img.src}
                type="button"
                onClick={() => insertImage(img.src)}
                className="group relative aspect-square overflow-hidden border border-[var(--frame)] bg-[var(--panel-bg)] transition hover:ring-2 hover:ring-[var(--frame)]"
                title={`Click to insert: ${img.filename}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.filename}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center font-sans text-[9px] text-white opacity-0 transition group-hover:opacity-100">
                  {img.filename.length > 12 ? img.filename.slice(0, 10) + "…" : img.filename}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="font-sans text-sm text-[var(--modal-fg)]/50">
            No images found. Use the <strong>Upload image</strong> button above.
          </p>
        )}
      </section>

      {/* ── Upload Modal ── */}
      {showUpload && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          aria-label="Upload blog image"
          onClick={closeUpload}
        >
          <div
            className="w-full max-w-md border border-[var(--frame)] bg-[var(--modal-bg)] p-6 text-[var(--modal-fg)] shadow-[0_30px_90px_var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-normal tracking-normal">Upload image</h2>
              <button
                type="button"
                onClick={closeUpload}
                className="grid h-8 w-8 place-items-center rounded-full border border-[var(--frame)] transition hover:bg-[var(--panel-bg)]"
                aria-label="Close"
              >
                <FaXmark className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
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
                  <div className="mt-3 relative aspect-square w-full max-w-[180px] overflow-hidden border border-[var(--frame)] bg-[var(--panel-bg)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadPreview}
                      alt="Preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block font-sans text-[10px] font-medium uppercase tracking-normal">
                    Year
                  </span>
                  <select
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    className="w-full border border-[var(--frame)] bg-[var(--page-bg-solid)] px-2 py-1 font-display text-sm tracking-normal text-[var(--page-fg)]"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <p className="font-sans text-[11px] text-[var(--modal-fg)]/60">
                Image will be saved to{" "}
                <code className="rounded bg-[var(--panel-bg)] px-1 py-0.5 text-[var(--panel-fg)]">
                  public/media/{uploadYear}/
                </code>
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
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
      )}

      <BlogPaneViewer
        open={paneOpen}
        onClose={() => setPaneOpen(false)}
        title={form.title}
        date={form.date}
        excerpt={form.excerpt}
        cover={resolveCoverField(form.cover, form.year || todayYear(), localImages)}
        year={form.year || todayYear()}
        slug={form.slug}
        content={form.content}
      />
    </div>
  );
}