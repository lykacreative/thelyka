"use client";

import { useState } from "react";
import { PortfolioManager } from "@/components/PortfolioManager";
import { BlogEditor } from "@/components/BlogEditor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BodyLock } from "@/components/BodyLock";
import type { Category, PortfolioItem } from "@/lib/portfolio";

type AdminPanelProps = {
  categories: Category[];
  existingYears: string[];
  existingItems: PortfolioItem[];
  blogImages: { src: string; year: string; slug: string; filename: string }[];
  blogYears: string[];
};

type Tab = "portfolio" | "blogs";

export function AdminPanel({
  categories,
  existingYears,
  existingItems,
  blogImages,
  blogYears
}: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>("portfolio");

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--page-fg)] transition-colors duration-300">
      <BodyLock locked={false} />
      <ThemeToggle />
      <section className="mx-auto w-full max-w-[1128px] px-5 pb-20 pt-20 sm:px-8">
        <header className="mx-auto mb-8 max-w-3xl text-center">
          <h1 className="font-display text-[36px] font-normal leading-none tracking-normal sm:text-[52px]">
            Admin
          </h1>
        </header>

        <div className="mx-auto mb-8 flex max-w-md justify-center gap-2">
          <button
            type="button"
            onClick={() => setTab("portfolio")}
            className={`border px-5 py-2 font-sans text-xs font-medium uppercase tracking-normal transition ${
              tab === "portfolio"
                ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                : "border-[var(--frame)] bg-transparent text-[var(--page-fg)] hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
            }`}
          >
            Portfolio
          </button>
          <button
            type="button"
            onClick={() => setTab("blogs")}
            className={`border px-5 py-2 font-sans text-xs font-medium uppercase tracking-normal transition ${
              tab === "blogs"
                ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                : "border-[var(--frame)] bg-transparent text-[var(--page-fg)] hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
            }`}
          >
            Blogs
          </button>
        </div>

        {tab === "portfolio" ? (
          <>
            <header className="mx-auto mb-8 max-w-3xl text-center">
              <p className="mx-auto max-w-xl font-display text-sm leading-relaxed sm:text-base">
                Pick an artwork, then set its title, date, and artist note. Place new image files in
                <code className="mx-1 rounded bg-[var(--panel-bg)] px-1 py-0.5 text-[var(--panel-fg)]">public/portfolio/&lt;category&gt;/&lt;year&gt;/</code>
                and refresh — they show up here automatically.
              </p>
            </header>
            <PortfolioManager
              categories={categories}
              existingYears={existingYears}
              existingItems={existingItems}
            />
          </>
        ) : (
          <>
            <header className="mx-auto mb-8 max-w-3xl text-center">
              <p className="mx-auto max-w-xl font-display text-sm leading-relaxed sm:text-base">
                Write posts in markdown. Place images in
                <code className="mx-1 rounded bg-[var(--panel-bg)] px-1 py-0.5 text-[var(--panel-fg)]">public/blogs/&lt;year&gt;/&lt;slug&gt;/</code>
                and refresh to pick them from the image browser below.
              </p>
            </header>
            <BlogEditor allImages={blogImages} years={blogYears} />
          </>
        )}
      </section>
    </main>
  );
}
