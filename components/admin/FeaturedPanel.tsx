"use client";

import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/admin-client";
import type { AdminItem } from "@/lib/admin-types";
import { SaveState, Thumb, clock, type SaveStatus } from "@/components/admin/ui";

type FeaturedPanelProps = {
  items: AdminItem[];
  onItemsChange: (update: (items: AdminItem[]) => AdminItem[]) => void;
};

function applyOrder(items: AdminItem[], ids: string[]) {
  const ranks = new Map(ids.map((id, index) => [id, index + 1]));
  return items.map((item) => {
    const featured = ranks.get(item.id) ?? null;
    return item.featured === featured ? item : { ...item, featured };
  });
}

// The homepage's featured pieces, in order. Every change (add, remove, reorder) saves right away.
export function FeaturedPanel({ items, onItemsChange }: FeaturedPanelProps) {
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });
  const [query, setQuery] = useState("");
  const dragFrom = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const saving = useRef(Promise.resolve());

  const featured = useMemo(
    () => items.filter((item) => item.featured !== null).sort((a, b) => (a.featured ?? 0) - (b.featured ?? 0)),
    [items]
  );

  const candidates = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items
      .filter((item) => item.featured === null)
      .filter((item) => !words.length || words.every((word) => `${item.title} ${item.date} ${item.category}`.toLowerCase().includes(word)))
      .slice(0, words.length ? 60 : 24);
  }, [items, query]);

  function commit(ids: string[]) {
    const before = featured.map((item) => item.id);
    onItemsChange((current) => applyOrder(current, ids));
    setStatus({ kind: "saving" });
    // One save at a time, in order.
    saving.current = saving.current.then(async () => {
      try {
        await api("/api/admin/featured", { method: "PUT", body: { ids } });
        setStatus({ kind: "saved", at: clock() });
      } catch (error) {
        onItemsChange((current) => applyOrder(current, before));
        setStatus({ kind: "error", message: `Not saved: ${error instanceof Error ? error.message : "save failed"}` });
      }
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= featured.length || from === to) return;
    const ids = featured.map((item) => item.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    commit(ids);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <section aria-labelledby="featured-heading" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="featured-heading" className="a-display text-2xl">
            On the homepage
          </h2>
          <SaveState state={status} />
        </div>
        <p className="mb-4 text-sm text-[var(--a-muted)]">
          The new homepage opens on these, in this order. Drag to reorder, or use the arrows (Alt+↑/↓ on a focused row).
        </p>

        {featured.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--a-line-strong)] px-4 py-10 text-center text-sm text-[var(--a-muted)]">
            Nothing featured yet. Add pieces from the list.
          </p>
        ) : (
          <ol className="divide-y divide-[var(--a-line)] overflow-hidden rounded-lg border border-[var(--a-line)]">
            {featured.map((item, index) => {
              const cover = item.gallery[item.coverIndex] ?? item.gallery[0];
              return (
                <li
                  key={item.id}
                  draggable
                  tabIndex={0}
                  aria-label={`${index + 1}. ${item.title}`}
                  onKeyDown={(event) => {
                    if (!event.altKey) return;
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      move(index, index - 1);
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      move(index, index + 1);
                    }
                  }}
                  onDragStart={(event) => {
                    dragFrom.current = index;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", item.id);
                  }}
                  onDragOver={(event) => {
                    if (dragFrom.current === null) return;
                    event.preventDefault();
                    setDropTarget(index);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragFrom.current !== null) move(dragFrom.current, index);
                    dragFrom.current = null;
                    setDropTarget(null);
                  }}
                  onDragEnd={() => {
                    dragFrom.current = null;
                    setDropTarget(null);
                  }}
                  className={`flex min-w-0 cursor-grab items-center gap-3 px-3 py-2 active:cursor-grabbing sm:px-4 ${
                    dropTarget === index ? "bg-[var(--a-raise)]" : ""
                  }`}
                >
                  <span className="w-6 flex-none text-right text-sm tabular-nums text-[var(--a-muted)]">{index + 1}</span>
                  <span className="h-12 w-12 flex-none overflow-hidden rounded bg-[var(--a-raise)]">
                    {cover ? <Thumb src={cover.src} size={48} className="h-full w-full object-cover" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{item.title}</span>
                    <span className="block truncate text-xs text-[var(--a-muted)]">{item.date || item.year}</span>
                  </span>
                  <span className="flex flex-none items-center">
                    <button type="button" className="a-btn a-btn--ghost a-btn--small !min-h-10 min-w-10 !px-2" aria-label="Move up" disabled={index === 0} onClick={() => move(index, index - 1)}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="a-btn a-btn--ghost a-btn--small !min-h-10 min-w-10 !px-2"
                      aria-label="Move down"
                      disabled={index === featured.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="a-btn a-btn--ghost a-btn--small !min-h-10 min-w-10 !px-2"
                      aria-label={`Remove ${item.title} from featured`}
                      onClick={() => commit(featured.filter((entry) => entry.id !== item.id).map((entry) => entry.id))}
                    >
                      ×
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section aria-labelledby="featured-add" className="min-w-0">
        <h2 id="featured-add" className="a-display mb-3 text-2xl">
          Add
        </h2>
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pieces" aria-label="Search pieces to feature" />
        <ul className="a-scroll-thin mt-3 max-h-[32rem] divide-y divide-[var(--a-line)] overflow-y-auto rounded-lg border border-[var(--a-line)]">
          {candidates.map((item) => {
            const cover = item.gallery[item.coverIndex] ?? item.gallery[0];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => commit([...featured.map((entry) => entry.id), item.id])}
                  className="flex w-full min-w-0 items-center gap-3 px-3 py-2 text-left hover:bg-[var(--a-panel)]"
                >
                  <span className="h-10 w-10 flex-none overflow-hidden rounded bg-[var(--a-raise)]">
                    {cover ? <Thumb src={cover.src} size={40} className="h-full w-full object-cover" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{item.title}</span>
                    <span className="block truncate text-xs text-[var(--a-muted)]">{item.date || item.year}</span>
                  </span>
                  <span className="flex-none text-sm text-[var(--a-muted)]" aria-hidden="true">
                    + Add
                  </span>
                </button>
              </li>
            );
          })}
          {candidates.length === 0 ? <li className="px-3 py-6 text-center text-sm text-[var(--a-muted)]">Nothing to add.</li> : null}
        </ul>
        {!query ? <p className="mt-2 text-xs text-[var(--a-faint)]">Newest first. Search to find older pieces.</p> : null}
      </section>
    </div>
  );
}
