"use client";

import { useState } from "react";
import { api } from "@/lib/admin-client";
import type { AdminEnvironment, AdminItem, AdminPost } from "@/lib/admin-types";
import { Dialog, SaveState, clock, type SaveStatus } from "@/components/admin/ui";

type PreviewToolsPanelProps = {
  env: AdminEnvironment;
  onReloaded: (items: AdminItem[], posts: AdminPost[]) => void;
};

// Preview deploys only: fill this preview's own database with a copy of the live items and posts.
export function PreviewToolsPanel({ env, onReloaded }: PreviewToolsPanelProps) {
  const [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

  async function copy() {
    setConfirm(false);
    setStatus({ kind: "working", message: "Copying the live items and posts…" });
    try {
      const result = await api<{ items: number; posts: number; from: string; into: string }>("/api/admin/preview/copy-live", { method: "POST" });
      const [items, posts] = await Promise.all([
        api<{ items: AdminItem[] }>("/api/admin/items"),
        api<{ posts: AdminPost[] }>("/api/admin/posts")
      ]);
      onReloaded(items.items, posts.posts);
      setStatus({ kind: "saved", at: clock(), note: `Copied ${result.items} items and ${result.posts} posts from ${result.from} into ${result.into}.` });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Copy failed." });
    }
  }

  const rows: [string, string][] = [
    ["This deploy", env.label === "preview" ? "Preview" : env.label === "local" ? "Local (next dev)" : "Live"],
    ["Database", env.dbName],
    ["Live database", env.copyLive.liveDbName],
    ["Cloudinary folder", `${env.cloudinaryRoot}/`]
  ];

  return (
    <div className="max-w-2xl">
      <h2 className="a-display text-2xl">Preview tools</h2>
      <p className="mt-2 text-sm text-[var(--a-muted)]">
        This deploy has its own database and Cloudinary folder, so testing here never changes the live site. Copied items keep their live image
        addresses, and a preview can never delete files outside its own folder.
      </p>

      <dl className="mt-5 divide-y divide-[var(--a-line)] rounded-lg border border-[var(--a-line)] text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
            <dt className="text-[var(--a-muted)]">{label}</dt>
            <dd className="min-w-0 break-all">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" className="a-btn a-btn--primary" disabled={!env.copyLive.enabled || status.kind === "working"} onClick={() => setConfirm(true)}>
          Copy the live items into this preview
        </button>
        <SaveState state={status} />
      </div>
      {!env.copyLive.enabled && env.copyLive.reason ? <p className="mt-2 text-sm text-[var(--a-warn)]">{env.copyLive.reason}</p> : null}

      <Dialog open={confirm} title="Replace this preview's data?" onClose={() => setConfirm(false)}>
        <p>
          Every item and blog post in <strong className="text-[var(--a-fg)]">{env.dbName}</strong> is replaced by a copy of the live ones from{" "}
          <strong className="text-[var(--a-fg)]">{env.copyLive.liveDbName}</strong>. The live site isn&apos;t touched.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="a-btn a-btn--primary" onClick={() => void copy()}>
            Copy
          </button>
          <button type="button" className="a-btn a-btn--ghost" onClick={() => setConfirm(false)}>
            Cancel
          </button>
        </div>
      </Dialog>
    </div>
  );
}
