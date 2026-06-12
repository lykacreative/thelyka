import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/blogs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BodyLock } from "@/components/BodyLock";
import { BlogList } from "@/components/BlogList";
import Link from "next/link";

export const metadata: Metadata = {
  title: "blog",
  description: "Thoughts, stories, and ideas from Lyka Mimics.",
  openGraph: {
    title: "blog · lyka mimics",
    description: "Thoughts, stories, and ideas from Lyka Mimics.",
    type: "website"
  }
};

export default function BlogsPage() {
  const posts = getBlogPosts();

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--page-fg)] transition-colors duration-300">
      <BodyLock locked={false} />
      <ThemeToggle />
      <section className="mx-auto w-full max-w-[1128px] px-5 pb-20 pt-20 sm:px-8">
        <nav className="mb-12 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-[var(--frame)] bg-transparent px-3 py-1 font-sans text-xs font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)]"
          >
            <span className="h-3.5 w-3.5 bg-[var(--page-fg)] [mask:url('/assets/figma-back.svg')_center/contain_no-repeat]" aria-hidden="true" />
            Home
          </Link>
        </nav>

        <header className="mb-12 text-center">
          <h1 className="font-display text-[36px] font-normal leading-none tracking-normal sm:text-[52px]">
            Blog
          </h1>
          <p className="mx-auto mt-4 max-w-xl font-display text-sm leading-relaxed sm:text-base">
            Thoughts, stories, and creative process notes.
          </p>
        </header>

        <BlogList posts={posts} />
      </section>
    </main>
  );
}
