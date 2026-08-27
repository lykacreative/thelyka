"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { BlogPost } from "@/lib/blogs";

type BlogListProps = {
  posts: BlogPost[];
};

export function BlogList({ posts }: BlogListProps) {
  const years = Array.from(
    new Set(posts.map((p) => p.year))
  ).sort((a, b) => b.localeCompare(a));

  const [activeYear, setActiveYear] = useState<string | null>(null);

  const filtered = activeYear
    ? posts.filter((p) => p.year === activeYear)
    : posts;

  const grouped = years
    .map((year) => ({
      year,
      posts: filtered.filter((p) => p.year === year),
    }))
    .filter((g) => g.posts.length > 0);

  return (
    <>
      {years.length > 0 ? (
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveYear(null)}
            className={`border px-4 py-1.5 font-sans text-[11px] font-medium uppercase tracking-normal transition ${
              activeYear === null
                ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                : "border-[var(--frame)] bg-transparent text-[var(--page-fg)] hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
            }`}
          >
            All
          </button>

          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setActiveYear(year)}
              className={`border px-4 py-1.5 font-sans text-[11px] font-medium uppercase tracking-normal transition ${
                activeYear === year
                  ? "border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]"
                  : "border-[var(--frame)] bg-transparent text-[var(--page-fg)] hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      ) : null}

      {grouped.length > 0 ? (
        <div className="space-y-14">
          {grouped.map((group) => (
            <section key={group.year}>
              <h2 className="mb-6 border-b border-[var(--frame)] pb-3 font-display text-2xl font-normal tracking-normal sm:text-3xl">
                {group.year}
              </h2>

              <ul className="columns-1 gap-[18px] sm:columns-2 lg:columns-3">
                {group.posts.map((post) => (
                  <li
                    key={post.slug}
                    className="mb-[18px] break-inside-avoid"
                  >
                    <Link
                      href={`/blogs/${post.slug}`}
                      className="group block border border-[var(--frame)] bg-transparent transition hover:opacity-80"
                    >
                      <span className="relative block aspect-[16/10] w-full overflow-hidden border-b border-[var(--frame)] bg-[var(--panel-bg)]">
                        {post.coverImage ? (
                          <Image
                            src={post.coverImage}
                            alt={post.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <span className="grid h-full w-full place-items-center font-display text-5xl font-normal text-[var(--frame)]/20">
                            {post.title.charAt(0)}
                          </span>
                        )}
                      </span>

                      <span className="block p-4">
                        <span className="flex items-center gap-2 font-sans text-[10px] font-medium uppercase tracking-widest text-[var(--modal-fg)]/50">
                          <time>{post.date}</time>
                        </span>

                        <span className="mt-2 block font-display text-lg font-normal leading-snug tracking-normal text-[var(--page-fg)] sm:text-xl">
                          {post.title}
                        </span>

                        {post.excerpt ? (
                          <span className="mt-2 block font-sans text-sm leading-relaxed text-[var(--modal-fg)]/60 line-clamp-2">
                            {post.excerpt}
                          </span>
                        ) : null}

                        <span className="mt-3 inline-flex items-center gap-1.5 border-b border-[var(--frame)] pb-0.5 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--page-fg)] lg:opacity-0 lg:transition lg:group-hover:opacity-100">
                          Read more
                          <span
                            className="h-2.5 w-2.5 bg-[var(--page-fg)] [mask:url('/assets/figma-back.svg')_center/contain_no-repeat] [mask-position:center] [mask-size:10px] rotate-180"
                            aria-hidden="true"
                          />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-[var(--frame)] p-12 text-center">
          <p className="font-display text-2xl tracking-normal text-[var(--modal-fg)]/60">
            No posts yet.
          </p>

          <p className="mt-2 font-sans text-sm tracking-normal text-[var(--modal-fg)]/50">
            Add your first blog from the{" "}
            <Link
              href="/admin"
              className="underline hover:text-[var(--panel-bg)]"
            >
              admin
            </Link>
            .
          </p>
        </div>
      )}
    </>
  );
}