"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminEnvironment, AdminItem, AdminPost } from "@/lib/admin-types";
import { ItemsPanel } from "@/components/admin/ItemsPanel";
import { FeaturedPanel } from "@/components/admin/FeaturedPanel";
import { BlogPanel } from "@/components/admin/BlogPanel";
import { PreviewToolsPanel } from "@/components/admin/PreviewToolsPanel";
import { ToastProvider, useToast } from "@/components/admin/ui";

type Tab = "items" | "featured" | "blog" | "preview";

type AdminAppProps = {
  initialItems: AdminItem[];
  initialPosts: AdminPost[];
  env: AdminEnvironment;
};

export function AdminApp(props: AdminAppProps) {
  return (
    <ToastProvider>
      <Admin {...props} />
    </ToastProvider>
  );
}

function Admin({ initialItems, initialPosts, env }: AdminAppProps) {
  const router = useRouter();
  const notify = useToast();
  const [items, setItems] = useState(initialItems);
  const [posts, setPosts] = useState(initialPosts);
  const [tab, setTab] = useState<Tab>("items");
  const dirty = useRef(new Set<string>());
  const [signingOut, setSigningOut] = useState(false);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "items", label: "Items", count: items.length },
    { id: "featured", label: "Featured", count: items.filter((item) => item.featured !== null).length },
    { id: "blog", label: "Blog", count: posts.length },
    ...(env.label !== "live" ? [{ id: "preview" as const, label: "Preview tools" }] : [])
  ];

  // The tab lives in the address (#featured) so a reload or the back button keeps it.
  useEffect(() => {
    const fromHash = window.location.hash.slice(1) as Tab;
    if (tabs.some((entry) => entry.id === fromHash)) setTab(fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function choose(next: Tab) {
    setTab(next);
    window.history.replaceState(null, "", next === "items" ? window.location.pathname : `#${next}`);
  }

  const migrationShown = useRef(false);
  useEffect(() => {
    if (migrationShown.current) return;
    migrationShown.current = true;
    if (env.blogMigration?.imported) {
      notify(`Moved ${env.blogMigration.imported} blog post(s) into the database. The old files stay in Cloudinary as a backup.`, "ok");
    } else if (env.blogMigration?.error) {
      notify(`Old blog posts not moved yet: ${env.blogMigration.error}`, "bad");
    }
  }, [env.blogMigration, notify]);

  const onDirtyChange = useCallback((key: string, value: boolean) => {
    if (value) dirty.current.add(key);
    else dirty.current.delete(key);
  }, []);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirty.current.size === 0) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  async function signOut() {
    if (dirty.current.size && !window.confirm("You have unsaved changes. Sign out anyway?")) return;
    setSigningOut(true);
    try {
      await fetch("/api/admin/auth", { method: "DELETE", credentials: "same-origin" });
    } finally {
      dirty.current.clear();
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pb-24 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-5 pt-6 sm:pt-8">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--a-muted)]">Lyka Mimics</p>
          <h1 className="a-display mt-1 text-4xl leading-none sm:text-5xl">Admin</h1>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          {env.label !== "live" ? (
            <span
              className="rounded-full border border-[var(--a-warn)] px-2.5 py-1 text-xs text-[var(--a-warn)]"
              title={`Database ${env.dbName} · Cloudinary ${env.cloudinaryRoot}/`}
            >
              {env.label === "preview" ? "Preview" : "Local"} · {env.dbName}
            </span>
          ) : null}
          <span className="hidden truncate text-[var(--a-muted)] sm:inline">{env.signedInAs}</span>
          <a className="a-btn a-btn--ghost a-btn--small" href="/" target="_blank" rel="noreferrer">
            View site ↗
          </a>
          <button type="button" className="a-btn a-btn--small" onClick={() => void signOut()} disabled={signingOut}>
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      {!env.cloudinaryReady ? (
        <p role="alert" className="mb-4 rounded-md border border-[var(--a-warn)] px-3 py-2 text-sm text-[var(--a-warn)]">
          Cloudinary isn&apos;t configured on this deploy, so uploads and deletes won&apos;t work.
        </p>
      ) : null}

      <nav aria-label="Sections" className="sticky top-0 z-20 -mx-4 mb-6 border-b border-[var(--a-line)] bg-[var(--a-bg)] px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <ul className="a-scroll-thin flex gap-1 overflow-x-auto">
          {tabs.map((entry) => (
            <li key={entry.id} className="flex-none">
              <button
                type="button"
                onClick={() => choose(entry.id)}
                aria-current={tab === entry.id ? "page" : undefined}
                className={`relative px-3 py-3 text-sm transition ${tab === entry.id ? "text-[var(--a-fg)]" : "text-[var(--a-muted)] hover:text-[var(--a-fg)]"}`}
              >
                {entry.label}
                {entry.count !== undefined ? <span className="ml-1.5 text-xs tabular-nums text-[var(--a-faint)]">{entry.count}</span> : null}
                {tab === entry.id ? <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 bg-[var(--a-fg)]" /> : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Panels stay mounted when hidden, so unsaved edits and running uploads survive switching tabs. */}
      <div hidden={tab !== "items"}>
        <ItemsPanel items={items} cloudinaryRoot={env.cloudinaryRoot} active={tab === "items"} onItemsChange={setItems} onDirtyChange={onDirtyChange} />
      </div>
      <div hidden={tab !== "featured"}>
        <FeaturedPanel items={items} onItemsChange={setItems} />
      </div>
      <div hidden={tab !== "blog"}>
        <BlogPanel posts={posts} active={tab === "blog"} onPostsChange={setPosts} onDirtyChange={onDirtyChange} />
      </div>
      {env.label !== "live" ? (
        <div hidden={tab !== "preview"}>
          <PreviewToolsPanel
            env={env}
            onReloaded={(nextItems, nextPosts) => {
              if (dirty.current.size) notify("Reloaded from the copy; open editors keep what you typed until you close them.", "info");
              setItems(nextItems);
              setPosts(nextPosts);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
