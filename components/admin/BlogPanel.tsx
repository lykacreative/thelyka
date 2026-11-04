"use client";

import { useCallback, useRef, useState } from "react";
import type { AdminPost, DeleteSummary } from "@/lib/admin-types";
import { PostEditor } from "@/components/admin/PostEditor";
import { describeFiles, useToast } from "@/components/admin/ui";

type BlogPanelProps = {
  posts: AdminPost[];
  active: boolean;
  onPostsChange: (update: (posts: AdminPost[]) => AdminPost[]) => void;
  onDirtyChange: (key: string, dirty: boolean) => void;
};

function sortPosts(posts: AdminPost[]) {
  return posts.slice().sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function BlogPanel({ posts, active, onPostsChange, onDirtyChange }: BlogPanelProps) {
  const notify = useToast();
  const [selected, setSelected] = useState<string>(posts[0]?.id ?? "new");
  const dirty = useRef(false);
  const post = selected === "new" ? null : posts.find((entry) => entry.id === selected) ?? null;

  const editorDirty = useCallback(
    (value: boolean) => {
      dirty.current = value;
      onDirtyChange("post", value);
    },
    [onDirtyChange]
  );

  function select(id: string) {
    if (id === selected) return;
    if (dirty.current) {
      notify("Save or discard this post first.", "bad");
      return;
    }
    setSelected(id);
  }

  function onSaved(saved: AdminPost, wasNew: boolean) {
    onPostsChange((current) => sortPosts(wasNew ? [saved, ...current] : current.map((entry) => (entry.id === saved.id ? saved : entry))));
    if (wasNew) {
      dirty.current = false;
      setSelected(saved.id);
      notify(`Published at /blogs/${saved.slug}.`, "ok");
    }
  }

  function onDeleted(id: string, files: DeleteSummary | null) {
    onPostsChange((current) => current.filter((entry) => entry.id !== id));
    dirty.current = false;
    setSelected("new");
    notify(`Post deleted. ${describeFiles(files)}`.trim(), "ok");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="Posts" className="min-w-0">
        <button type="button" className={`a-btn w-full ${selected === "new" ? "a-btn--primary" : ""}`} onClick={() => select("new")}>
          New post
        </button>
        <ul className="mt-3 divide-y divide-[var(--a-line)] overflow-hidden rounded-lg border border-[var(--a-line)]">
          {posts.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => select(entry.id)}
                aria-current={entry.id === selected ? "true" : undefined}
                className={`block w-full min-w-0 px-3 py-2.5 text-left ${entry.id === selected ? "bg-[var(--a-raise)]" : "hover:bg-[var(--a-panel)]"}`}
              >
                <span className="block truncate text-sm">{entry.title}</span>
                <span className="block truncate text-xs text-[var(--a-muted)]">
                  {entry.date} · /{entry.slug}
                  {entry.featured ? " · on homepage" : ""}
                </span>
              </button>
            </li>
          ))}
          {posts.length === 0 ? <li className="px-3 py-4 text-sm text-[var(--a-muted)]">No posts yet.</li> : null}
        </ul>
      </nav>

      <PostEditor key={post?.id ?? "new"} post={post} posts={posts} active={active} onSaved={onSaved} onDeleted={onDeleted} onDirtyChange={editorDirty} />
    </div>
  );
}
