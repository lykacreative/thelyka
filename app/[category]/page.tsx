import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GalleryGrid } from "@/components/GalleryGrid";
import { categories, getItemsByCategory, type Category } from "@/lib/portfolio";

type CategoryPageProps = {
  params: {
    category: string;
  };
};

const categoryDescriptions: Record<Category, string> = {
  design: "Design work and visual experiments by Lyka Mimics.",
  reviews: "Reviews and critiques by Lyka Mimics.",
  sketches: "Sketches and drawings by Lyka Mimics."
};

export function generateStaticParams() {
  return categories.map((category) => ({ category }));
}

export function generateMetadata({ params }: CategoryPageProps): Metadata {
  const category = params.category as Category;
  if (!categories.includes(category)) return {};

  const title = category.charAt(0).toUpperCase() + category.slice(1);
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

export default function CategoryPage({ params }: CategoryPageProps) {
  if (!categories.includes(params.category as Category)) {
    notFound();
  }

  const category = params.category as Category;
  const items = getItemsByCategory(category);

  return <GalleryGrid category={category} items={items} />;
}
