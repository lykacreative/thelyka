import { redirect } from "next/navigation";
import { AdminPanel } from "@/components/AdminPanel";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { categories, getPortfolioItems } from "@/lib/portfolio";
import { getAllBlogImages, getBlogYears } from "@/lib/blogs";

export const metadata = {
  title: "admin",
  description: "Manage portfolio and blog posts."
};

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login?next=/admin");
  }

  const items = getPortfolioItems();
  const knownYears = Array.from(
    new Set(items.map((item) => item.year).filter((year) => /^\d{4}$/.test(year)))
  ).sort((a, b) => b.localeCompare(a));
  const blogImages = getAllBlogImages();
  const blogYears = getBlogYears();

  return (
    <AdminPanel
      categories={[...categories]}
      existingYears={knownYears}
      existingItems={items}
      blogImages={blogImages}
      blogYears={blogYears}
    />
  );
}
