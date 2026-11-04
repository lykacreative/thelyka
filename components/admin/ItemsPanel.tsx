"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { artTypes } from "@/lib/art-types";
import { reviewTypes } from "@/lib/review-types";
import type { AdminItem, DeleteSummary } from "@/lib/admin-types";
import { ItemEditor } from "@/components/admin/ItemEditor";
import { NewItemsPanel } from "@/components/admin/NewItemsPanel";
import { Thumb, describeFiles, hasFiles, useToast } from "@/components/admin/ui";

const CATEGORY_LABEL: Record<AdminItem["category"], string> = { design: "Design", arts: "Art", reviews: "Reviews" };

type ItemsPanelProps = {
  items: AdminItem[];
  cloudinaryRoot: string;
  active: boolean;
  onItemsChange: (update: (items: AdminItem[]) => AdminItem[]) => void;
  onDirtyChange: (key: string, dirty: boolean) => void;
};

function sortItems(items: AdminItem[]) {
  return items
    .slice()
    .sort((a, b) => b.year.localeCompare(a.year) || b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

function typeOf(item: AdminItem) {
  return item.category === "arts" ? item.artType : item.category === "reviews" ? item.reviewType : null;
}

const Row = memo(function Row({ item, open, onToggle }: { item: AdminItem; open: boolean; onToggle: (id: string) => void }) {
  const cover = item.gallery[item.coverIndex] ?? item.gallery[0];
  const type = typeOf(item);
  return (
    <button
      type="button"
      onClick={() => onToggle(item.id)}
      aria-expanded={open}
      className={`flex w-full min-w-0 items-center gap-3 px-3 py-2.5 text-left transition sm:gap-4 sm:px-4 ${
        open ? "bg-[var(--a-raise)]" : "hover:bg-[var(--a-panel)]"
      }`}
    >
      <span className={`h-14 w-14 flex-none overflow-hidden rounded bg-[var(--a-raise)] ${item.hidden ? "opacity-45 grayscale" : ""}`}>
        {cover ? <Thumb src={cover.src} size={56} className="h-full w-full object-cover" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.95rem] text-[var(--a-fg)]">{item.title || "Untitled"}</span>
        <span className="mt-0.5 block truncate text-xs text-[var(--a-muted)]">
          {CATEGORY_LABEL[item.category]}
          {type ? ` · ${type}` : ""} · {item.date || item.year}
          {item.gallery.length > 1 ? ` · ${item.gallery.length} images` : ""}
        </span>
      </span>
      {item.hidden ? (
        <span className="a-tag a-tag--hidden flex-none" title="Hidden: kept here, not on the site">
          Hidden
        </span>
      ) : null}
      {item.featured !== null ? (
        <span className="a-tag flex-none" title="Featured">
          ★ {item.featured}
        </span>
      ) : null}
      <span aria-hidden="true" className={`flex-none text-[var(--a-faint)] transition ${open ? "rotate-90" : ""}`}>
        ›
      </span>
    </button>
  );
});

// Every item in one fast list: search, filter, click a row to edit it right there.
export function ItemsPanel({ items, cloudinaryRoot, active, onItemsChange, onDirtyChange }: ItemsPanelProps) {
  const notify = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"all" | AdminItem["category"]>("all");
  const [type, setType] = useState("all");
  const [year, setYear] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newFiles, setNewFiles] = useState<File[] | null>(null);
  const [fileOver, setFileOver] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const dirtyEditors = useRef(new Set<string>());

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (event.key === "/" && !typing) {
        event.preventDefault();
        search.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const years = useMemo(() => Array.from(new Set(items.map((item) => item.year).filter(Boolean))).sort((a, b) => b.localeCompare(a)), [items]);

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      if (item.id === openId) return true;
      if (category !== "all" && item.category !== category) return false;
      if (type !== "all" && typeOf(item) !== type) return false;
      if (year !== "all" && item.year !== year) return false;
      if (featuredOnly && item.featured === null) return false;
      if (hiddenOnly && !item.hidden) return false;
      if (words.length) {
        const haystack = `${item.title} ${item.note} ${item.date}`.toLowerCase();
        if (!words.every((word) => haystack.includes(word))) return false;
      }
      return true;
    });
  }, [items, query, category, type, year, featuredOnly, hiddenOnly, openId]);

  const hiddenCount = useMemo(() => items.filter((item) => item.hidden).length, [items]);
  const typeOptions = category === "arts" ? artTypes : category === "reviews" ? reviewTypes : [];

  const openRef = useRef(openId);
  openRef.current = openId;

  const toggle = useCallback(
    (id: string) => {
      const current = openRef.current;
      if (current && dirtyEditors.current.has(current)) {
        notify(current === id ? "Save or discard first (or use Close)." : "Save or discard the open item first.", "bad");
        return;
      }
      setOpenId(current === id ? null : id);
    },
    [notify]
  );

  const editorDirty = useCallback(
    (id: string, dirty: boolean) => {
      if (dirty) dirtyEditors.current.add(id);
      else dirtyEditors.current.delete(id);
      onDirtyChange(`item:${id}`, dirty);
    },
    [onDirtyChange]
  );

  const newDirty = useCallback((dirty: boolean) => onDirtyChange("new-items", dirty), [onDirtyChange]);

  function onSaved(saved: AdminItem) {
    onItemsChange((current) => sortItems(current.map((item) => (item.id === saved.id ? saved : item))));
  }

  function onDeleted(id: string, files: DeleteSummary | null) {
    onItemsChange((current) => current.filter((item) => item.id !== id));
    setOpenId(null);
    notify(`Item deleted. ${describeFiles(files)}`.trim(), "ok");
  }

  const pickInput = useRef<HTMLInputElement>(null);

  function startNew(files: File[]) {
    if (newFiles) {
      notify("Finish or cancel the new work above first.", "bad");
      return;
    }
    setNewFiles(files);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div
      className={`min-h-[60vh] rounded-lg ${fileOver ? "a-drop-active" : ""}`}
      onDragOver={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setFileOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFileOver(false);
      }}
      onDrop={(event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        setFileOver(false);
        startNew(Array.from(event.dataTransfer.files));
      }}
    >
      {newFiles ? (
        <NewItemsPanel
          initialFiles={newFiles}
          onCreated={(created) => onItemsChange((current) => sortItems([...created, ...current]))}
          onClose={() => setNewFiles(null)}
          onDirtyChange={newDirty}
        />
      ) : (
        <>
          <button
            type="button"
            onClick={() => pickInput.current?.click()}
            className="mb-6 flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--a-line-strong)] px-4 py-6 text-center transition hover:border-[var(--a-muted)]"
          >
            <span className="text-[0.95rem]">New work</span>
            <span className="text-xs text-[var(--a-muted)]">Drop images anywhere on this page, or click to pick them</span>
          </button>
          <input
            ref={pickInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) startNew(files);
            }}
          />
        </>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <label className="relative block min-w-0">
          <span className="sr-only">Search</span>
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search titles and notes"
            className="!pr-9"
          />
          <span className="a-kbd pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden="true">
            /
          </span>
        </label>
        <select
          aria-label="Category"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value as typeof category);
            setType("all");
          }}
        >
          <option value="all">All categories</option>
          <option value="design">Design</option>
          <option value="arts">Art</option>
          <option value="reviews">Reviews</option>
        </select>
        <select aria-label="Type" value={type} onChange={(event) => setType(event.target.value)} disabled={typeOptions.length === 0}>
          <option value="all">All types</option>
          {typeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select aria-label="Year" value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="all">All years</option>
          {years.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--a-muted)]">
        <p aria-live="polite">
          {filtered.length === items.length ? `${items.length} items` : `${filtered.length} of ${items.length} items`}
          {hiddenCount ? ` · ${hiddenCount} hidden` : ""}
        </p>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={featuredOnly} onChange={(event) => setFeaturedOnly(event.target.checked)} />
            Featured only
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={hiddenOnly} onChange={(event) => setHiddenOnly(event.target.checked)} />
            Hidden only
          </label>
        </span>
      </div>

      <ul className="divide-y divide-[var(--a-line)] overflow-hidden rounded-lg border border-[var(--a-line)]">
        {filtered.map((item) => (
          <li key={item.id} className="min-w-0">
            <Row item={item} open={openId === item.id} onToggle={toggle} />
            {openId === item.id ? (
              <ItemEditor
                item={item}
                active={active}
                cloudinaryRoot={cloudinaryRoot}
                onSaved={onSaved}
                onDeleted={onDeleted}
                onClose={() => setOpenId(null)}
                onDirtyChange={editorDirty}
              />
            ) : null}
          </li>
        ))}
        {filtered.length === 0 ? <li className="px-4 py-10 text-center text-sm text-[var(--a-muted)]">Nothing matches.</li> : null}
      </ul>
    </div>
  );
}
