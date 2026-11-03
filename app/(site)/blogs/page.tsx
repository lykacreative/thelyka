import type { Metadata } from "next";
import { getBlogPosts } from "@/lib/blogs";
import { plainText } from "@/lib/site-items";
import { toSitePost } from "@/lib/site/data";
import { ZinePage } from "@/components/site/ZinePage";
import { BlogIndex } from "@/components/site/BlogIndex";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "blog",
  description: "Thoughts, stories, and ideas from Lyka Mimics.",
  openGraph: {
    title: "blog · Lyka Mimics",
    description: "Thoughts, stories, and ideas from Lyka Mimics.",
    type: "website",
    images: ["/opengraph-image"],
  },
};

// The blog page: every post, searchable by title and text.
export default async function BlogsPage() {
  const posts = await getBlogPosts();
  return (
    <ZinePage backLabel="Home" fallback="/#blog">
      <BlogIndex posts={posts.map((post) => ({ ...toSitePost(post), text: plainText(post.content) }))} />
    </ZinePage>
  );
}
