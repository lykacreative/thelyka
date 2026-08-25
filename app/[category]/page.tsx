import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryGrid } from "@/components/GalleryGrid";
import { ArtGalleryGrid } from "@/components/ArtGalleryGrid";
import { ReviewGalleryGrid } from "@/components/ReviewGalleryGrid";
import { categories, getItemsByCategory, type Category } from "@/lib/portfolio";

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
  return categories
    .filter((category) => category !== "arts")
    .map((category) => ({ category }));
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
      type: "website"
    }
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: categoryParam } = await params;
  if (!categories.includes(categoryParam as Category)) {
    notFound();
  }

  const category = categoryParam as Category;
  const items = await getItemsByCategory(category);

  if (category === "arts") {
    return <ArtGalleryGrid items={items} />;
  }

  if (category === "reviews") {
    return <ReviewGalleryGrid items={items} />;
  }

  return <GalleryGrid category={category} items={items} />;
}
