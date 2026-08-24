import type { Metadata } from "next";
import { HomePage } from "@/components/HomePage";
import { getItemsGroupedByCategory, getLogoSrc } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "Lyka Mimics",
  description: "Portfolio of Lyka Mimics — design, art, and reviews.",
  openGraph: {
    title: "Lyka Mimics",
    description: "Portfolio of Lyka Mimics — design, art, and reviews.",
    type: "website"
  }
};

export default async function Page() {
  const groups = await getItemsGroupedByCategory();
  const logoSrc = getLogoSrc();

  return <HomePage groups={groups} logoSrc={logoSrc} />;
}
