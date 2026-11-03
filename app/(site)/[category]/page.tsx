import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignSection } from "@/components/site/DesignSection";
import { ReviewsSection } from "@/components/site/ReviewsSection";
import { categories, type Category } from "@/lib/portfolio";

type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

const categoryDescriptions: Record<Category, string> = {
  design: "Design work and visual experiments by Lyka Mimics.",
  reviews: "Reviews and critiques by Lyka Mimics.",
  arts: "Art and drawings by Lyka Mimics."
};

export function generateStaticParams() {
  return categories.filter((category) => category !== "arts").map((category) => ({ category }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: categoryParam } = await params;
  const category = categoryParam as Category;
  if (!categories.includes(category)) return {};

  const title = category === "arts" ? "Art" : category.charAt(0).toUpperCase() + category.slice(1);
  return {
    title,
    description: categoryDescriptions[category],
    openGraph: {
      title,
      description: categoryDescriptions[category],
      type: "website",
      images: ["/opengraph-image"]
    }
  };
}

// /design and /reviews: that section of the home page on its own page.
export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  if (category !== "design" && category !== "reviews") notFound();

  return (
    <main id="main">
      <h1 className="vh">{category === "design" ? "Design" : "Reviews"} · Lyka Mimics</h1>
      <span id="top" />
      {category === "design" ? <DesignSection /> : <ReviewsSection syncPath />}
    </main>
  );
}
