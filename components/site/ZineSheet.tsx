/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Fragment } from "react";
import { formatDate, pad2 } from "@/lib/site-items";
import { ZineBody } from "./ZineBody";

export type ZineSheetPost = { title: string; date: string; readTime: number; coverImage?: string | null; content: string };
type Neighbour = { slug: string; title: string } | null;

function To({ newTab, href, className, children }: { newTab: boolean; href: string; className: string; children: React.ReactNode }) {
  return newTab ? (
    <a className={className} href={href} target="_blank" rel="noopener">
      {children}
    </a>
  ) : (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

// One post as the shop fanzine: stapled sheet, cut-out title, pictures that open bigger, the posts either side.
// The post page and the admin's blog preview both draw it, so the preview is the page. In the preview
// (newTab) the links to other posts open the live pages in a new tab instead of leaving the preview.
export function ZineSheet({
  post,
  index,
  total,
  prev,
  next,
  newTab = false
}: {
  post: ZineSheetPost;
  index: number;
  total: number;
  prev: Neighbour;
  next: Neighbour;
  newTab?: boolean;
}) {
  return (
    <article className="zn-sheet">
      <span className="staple s1" aria-hidden="true" />
      <span className="staple s2" aria-hidden="true" />
      <header className="zn-head">
        <p className="zn-kick">
          Blog · {pad2(index + 1)} / {pad2(total)}
        </p>
        <h1 className="zn-title">
          {post.title
            .split(/\s+/)
            .filter(Boolean)
            .map((word, i) => (
              <Fragment key={i}>
                {i ? " " : null}
                <span className="cw">{word}</span>
              </Fragment>
            ))}
        </h1>
        <p className="zn-meta">
          {formatDate(post.date)} · {post.readTime} min read
        </p>
        {post.coverImage ? (
          <figure className="zn-fig zn-cover">
            <button className="zn-imgbtn" type="button" data-zoom="" aria-label="Bigger: the cover">
              <img src={post.coverImage} alt={post.title} decoding="async" />
            </button>
          </figure>
        ) : null}
      </header>
      <ZineBody content={post.content} />
      <nav className="zn-end" aria-label="More posts">
        {prev ? (
          <To newTab={newTab} className="zn-pn prev" href={`/blogs/${prev.slug}`}>
            <small>← Previous post</small>
            <b>{prev.title}</b>
          </To>
        ) : null}
        {next ? (
          <To newTab={newTab} className="zn-pn next" href={`/blogs/${next.slug}`}>
            <small>Next post →</small>
            <b>{next.title}</b>
          </To>
        ) : null}
        <To newTab={newTab} className="pill y zn-back2" href="/blogs">
          Back to the blog
        </To>
      </nav>
    </article>
  );
}
