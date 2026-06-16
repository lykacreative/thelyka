import type { Metadata } from "next";
import { HomePage } from "@/components/HomePage";
import { getItemsGroupedByCategory, getLogoSrc } from "@/lib/portfolio";

export const metadata: Metadata = {
  title: "Lyka Mimics",
  description: "Portfolio of Lyka Mimics — design, sketches, and reviews.",
  openGraph: {
    title: "Lyka Mimics",
    description: "Portfolio of Lyka Mimics — design, sketches, and reviews.",
    type: "website"
  }
};

export default function Page() {
  const groups = getItemsGroupedByCategory();
  const logoSrc = getLogoSrc();

  return <HomePage groups={groups} logoSrc={logoSrc} />;
}
