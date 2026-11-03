/* eslint-disable @next/next/no-img-element */
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { Fragment } from "react";
import type { Metadata } from "next";
import { getBlogPost, getBlogPosts, getBlogRedirect } from "@/lib/blogs";
import { formatDate, pad2 } from "@/lib/site-items";
import { ZinePage } from "@/components/site/ZinePage";
import { ZineBody } from "@/components/site/ZineBody";

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const revalidate = 300;

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;

  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: "not found",
    };
  }

  const title = post.title;
  const description =
    post.excerpt || "Blog post by Lyka Mimics";

  return {
    title,
    description,

    openGraph: {
      title,
      description,
      type: "article",

      ...(post.coverImage
        ? {
            images: [
              {
                url: post.coverImage,
                width: 1200,
                height: 630,
                alt: post.title,
              },
            ],
          }
        : {}),
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,

      ...(post.coverImage
        ? {
            images: [post.coverImage],
          }
        : {}),
    },
  };
}

// A post as the shop fanzine: stapled sheet, cut-out title, pictures that open bigger, the posts either side.
export default async function BlogPostPage({
  params,
}: BlogPostPageProps) {
  const { slug } = await params;

  const post = await getBlogPost(slug);

  if (!post) {
    // A renamed post: its old address moves permanently to the new one.
    const renamedTo = await getBlogRedirect(slug);
    if (renamedTo) {
      permanentRedirect(`/blogs/${renamedTo}`);
    }
    notFound();
  }

  const posts = await getBlogPosts();
  const index = posts.findIndex((p) => p.slug === post.slug);
  const prev = index > 0 ? posts[index - 1] : null;
  const next = index >= 0 ? posts[index + 1] ?? null : null;

  return (
    <ZinePage backLabel="Back" fallback="/blogs">
      <article className="zn-sheet">
        <span className="staple s1" aria-hidden="true" />
        <span className="staple s2" aria-hidden="true" />
        <header className="zn-head">
          <p className="zn-kick">Blog · {pad2(index + 1)} / {pad2(posts.length)}</p>
          <h1 className="zn-title">
            {post.title.split(/\s+/).filter(Boolean).map((word, i) => (
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
            <Link className="zn-pn prev" href={`/blogs/${prev.slug}`}>
              <small>← Previous post</small>
              <b>{prev.title}</b>
            </Link>
          ) : null}
          {next ? (
            <Link className="zn-pn next" href={`/blogs/${next.slug}`}>
              <small>Next post →</small>
              <b>{next.title}</b>
            </Link>
          ) : null}
          <Link className="pill y zn-back2" href="/blogs">
            Back to the blog
          </Link>
        </nav>
      </article>
    </ZinePage>
  );
}
