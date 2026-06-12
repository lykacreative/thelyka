import { notFound } from "next/navigation";
import { GalleryGrid } from "@/components/GalleryGrid";
import { categories, getItemsByCategory, type Category } from "@/lib/portfolio";

type CategoryPageProps = {
  params: {
    category: string;
  };
};

export function generateStaticParams() {
  return categories.map((category) => ({ category }));
}

export default function CategoryPage({ params }: CategoryPageProps) {
  if (!categories.includes(params.category as Category)) {
    notFound();
  }

  const category = params.category as Category;
  const items = getItemsByCategory(category);

  return <GalleryGrid category={category} items={items} />;
}
