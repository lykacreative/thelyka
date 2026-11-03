/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatDate, type SitePost } from "@/lib/site-items";
import { EmptyNote } from "./EmptyNote";

// Blog on the home page: the posts picked "Feature on homepage" in the admin (up to 3, newest first; with none
// picked, the newest 3), and "All posts" for the blog page.
export function BlogSection({ posts, total }: { posts: SitePost[]; total: number }) {
  return (
    <section className="sec blog" id="blog" aria-labelledby="blog-h">
      <div className="wrap">
        <div className="sec-head">
          <h2 className="script" id="blog-h">
            Blog
          </h2>
          <span className="count-oval">{`${total}${total === 1 ? " post" : " posts"}`}</span>
        </div>
        {posts.length ? null : <EmptyNote title="No posts yet.">The first one is on its way.</EmptyNote>}
        <div className="notes">
          {posts.map((post, i) => (
            <Link key={post.slug} className="note" href={`/blogs/${post.slug}`} style={{ ["--r" as string]: i % 2 ? "1.2deg" : "-1.4deg" }}>
              <span className="clip" aria-hidden="true" />
              <span className="note-img">{post.coverImage ? <img src={post.coverImage} loading="lazy" decoding="async" alt="" /> : null}</span>
              <span className="note-body">
                <span className="note-kick">
                  {formatDate(post.date)} · {post.readTime} min read
                </span>
                <h3>{post.title}</h3>
                <p className="ex">{post.excerpt}</p>
                <span className="note-go">Read the post →</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="blog-all">
          <Link className="pill y" href="/blogs">
            <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 2.5h8l2 2v9H3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M5.5 7h5M5.5 10h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            All posts <b>{total}</b>
          </Link>
        </div>
      </div>
    </section>
  );
}
