"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatDate, postMatches, sortPosts, type SitePost } from "@/lib/site-items";

export type IndexPost = SitePost & { text: string };

const STEP = 12;
const TILT = [-1.2, 0.9, -0.5, 1.3];

// The blog page: every post as a card, searchable by title and text, newest or oldest first,
// twelve at a time. Round 3 of the mockup: kept as its own component.
export function BlogIndex({ posts }: { posts: IndexPost[] }) {
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");
  const [shown, setShown] = useState(STEP);
  const input = useRef<HTMLInputElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  const focusAt = useRef<number | null>(null);

  const q = query.trim();
  const hits = useMemo(() => sortPosts(posts, order).filter((post) => postMatches(post, q)), [posts, order, q]);
  const show = hits.slice(0, shown);
  const left = hits.length - show.length;
  const searching = q.length > 0;

  useEffect(() => {
    const index = focusAt.current;
    if (index === null) return;
    focusAt.current = null;
    grid.current?.querySelectorAll<HTMLElement>(".bx-card")[index]?.focus({ preventScroll: true });
  }, [shown]);

  const search = (value: string) => {
    setQuery(value);
    setShown(STEP);
  };
  const clear = () => {
    search("");
    input.current?.focus();
  };

  return (
    <div className="zn-sheet bx-sheet">
      <span className="staple s1" aria-hidden="true" />
      <span className="staple s2" aria-hidden="true" />
      <header className="zn-head bx-head">
        <p className="zn-kick">Lyka Mimics · Blog</p>
        <h1 className="zn-title" id="bx-title">
          <span className="cw">All</span> <span className="cw">posts</span>
        </h1>
        <p className="zn-meta">{`${posts.length}${posts.length === 1 ? " post" : " posts"}`}</p>
      </header>
      <div className="bx-tools">
        <label className="bx-search">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
            <path d="M12.6 12.6 17 17" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
          <input
            ref={input}
            type="search"
            placeholder="Search the posts"
            aria-label="Search the posts by title or text"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => search(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                search("");
              }
            }}
          />
          <button type="button" className="bx-x" aria-label="Clear the search" hidden={!query} onClick={clear}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </label>
        <div className="bx-sort" role="group" aria-label="Order">
          <button
            type="button"
            aria-pressed={order === "newest"}
            onClick={() => {
              setOrder("newest");
              setShown(STEP);
            }}
          >
            Newest
          </button>
          <button
            type="button"
            aria-pressed={order === "oldest"}
            onClick={() => {
              setOrder("oldest");
              setShown(STEP);
            }}
          >
            Oldest
          </button>
        </div>
      </div>
      <p className="bx-count" aria-live="polite">
        {searching && hits.length ? `${hits.length} of ${posts.length} match “${q}”` : ""}
      </p>
      <ul className="bx-grid" ref={grid}>
        {show.map((post, i) => (
          <li key={post.slug}>
            <Link className="bx-card" href={`/blogs/${post.slug}`} style={{ ["--r" as string]: `${TILT[i % TILT.length]}deg` }}>
              <span className="bx-tape" aria-hidden="true" />
              <span className="bx-img">{post.coverImage ? <img src={post.coverImage} loading="lazy" decoding="async" alt="" /> : null}</span>
              <span className="bx-body">
                <span className="bx-kick">
                  {formatDate(post.date)} · {post.readTime} min read
                </span>
                <span className="bx-t">{post.title}</span>
                <span className="bx-ex">{post.excerpt}</span>
                <span className="bx-go">Read the post</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="bx-none" hidden={!searching || hits.length > 0}>
        <p className="bx-none-t">
          Nothing here matches “<span>{q}</span>”.
        </p>
        <p>Try another word, or look through everything.</p>
        <button className="pill y" type="button" onClick={clear}>
          Show all posts
        </button>
      </div>
      <div className="bx-more-row">
        <button
          className="pill alt"
          type="button"
          hidden={left <= 0}
          onClick={() => {
            focusAt.current = shown;
            setShown((s) => s + STEP);
          }}
        >
          More posts ({left})
        </button>
      </div>
    </div>
  );
}
