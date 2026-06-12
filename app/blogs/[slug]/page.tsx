import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getBlogPost, getBlogPosts } from "@/lib/blogs";
import { BlogRenderer } from "@/components/BlogRenderer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BodyLock } from "@/components/BodyLock";

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return getBlogPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: BlogPostPageProps) {
  const post = getBlogPost(params.slug);
  if (!post) return { title: "not found" };

  const title = post.title;
  const description = post.excerpt || "Blog post by Lyka Mimics";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      ...(post.coverImage && {
        images: [
          {
            url: post.coverImage,
            width: 1200,
            height: 630,
            alt: post.title
          }
        ]
      })
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(post.coverImage && {
        images: [post.coverImage]
      })
    }
  };
}

export default function BlogPostPage({ params }: BlogPostPageProps) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--page-fg)] transition-colors duration-300">
      <BodyLock locked={false} />
      <ThemeToggle />
      <article className="mx-auto w-full max-w-[720px] px-5 pb-20 pt-20 sm:px-8">
        <nav className="mb-12 flex items-center justify-between">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 border border-[var(--frame)] bg-transparent px-3 py-1 font-sans text-xs font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
          >
            <span className="h-3.5 w-3.5 bg-[var(--page-fg)] [mask:url('/assets/figma-back.svg')_center/contain_no-repeat]" aria-hidden="true" />
            All posts
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-[var(--frame)] bg-transparent px-3 py-1 font-sans text-xs font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
          >
            Home
          </Link>
        </nav>

        <header className="mb-10 border-b border-[var(--frame)] pb-8">
          <time className="font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-bg)]">
            {post.date}
          </time>
          <h1 className="mt-3 font-display text-[32px] font-normal leading-[1.1] tracking-normal sm:text-[48px]">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-[var(--page-fg)]/70">
              {post.excerpt}
            </p>
          ) : null}
        </header>

        {post.coverImage ? (
          <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden border border-[var(--frame)] bg-[var(--panel-bg)]">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              sizes="(max-width: 720px) 100vw, 720px"
              className="object-cover"
              priority
            />
          </div>
        ) : null}

        <div className="lyka-prose">
          <BlogRenderer content={post.content} />
        </div>
      </article>
    </main>
  );
}
