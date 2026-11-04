/* eslint-disable @next/next/no-img-element */
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { getBlogPost, getBlogPosts, getBlogRedirect } from "@/lib/blogs";
import { ZinePage } from "@/components/site/ZinePage";
import { ZineSheet } from "@/components/site/ZineSheet";

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
      <ZineSheet
        post={post}
        index={index}
        total={posts.length}
        prev={prev ? { slug: prev.slug, title: prev.title } : null}
        next={next ? { slug: next.slug, title: next.title } : null}
      />
    </ZinePage>
  );
}
