import type { Metadata } from "next";
import { Hero } from "@/components/site/Hero";
import { DesignSection } from "@/components/site/DesignSection";
import { ArtSection } from "@/components/site/ArtSection";
import { ReviewsSection } from "@/components/site/ReviewsSection";
import { BlogSection } from "@/components/site/BlogSection";
import { AboutSection } from "@/components/site/AboutSection";
import { homePosts } from "@/lib/blog-featured";
import { ABOUT_PHOTO, getFeaturedKeys, getSiteData, toSitePost } from "@/lib/site/data";

export const metadata: Metadata = {
  // absolute: the home sits under the site layout now, so the root template would make it "Lyka Mimics · Lyka Mimics"
  title: { absolute: "Lyka Mimics" },
  description: "Portfolio of Lyka Mimics — design, art, and reviews.",
  openGraph: {
    title: "Lyka Mimics",
    description: "Portfolio of Lyka Mimics — design, art, and reviews.",
    type: "website"
  }
};

// The home page: the whole catalogue on one page, section by section.
export default async function Page() {
  const [{ posts }, featuredKeys] = await Promise.all([getSiteData(), getFeaturedKeys()]);
  return (
    <main id="main">
      <Hero featuredKeys={featuredKeys} />
      <DesignSection />
      <ArtSection />
      <ReviewsSection />
      <BlogSection posts={homePosts(posts).map(toSitePost)} total={posts.length} />
      <AboutSection photo={ABOUT_PHOTO} />
    </main>
  );
}
