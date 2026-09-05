import type { MetadataRoute } from "next";
import { categories } from "@/lib/portfolio";
import { getBlogPosts } from "@/lib/blogs";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.SITE_URL || "https://lykamimics.com";

  const categoryPages: MetadataRoute.Sitemap = categories.map(
    (category) => ({
      url: `${siteUrl}/${category}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    })
  );

  const posts = await getBlogPosts();

  const blogPosts: MetadataRoute.Sitemap = posts.map(
    (post) => ({
      url: `${siteUrl}/blogs/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly",
      priority: 0.6,
    })
  );

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...categoryPages,
    ...blogPosts,
  ];
}