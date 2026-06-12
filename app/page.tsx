import { HomePage } from "@/components/HomePage";
import { getItemsGroupedByCategory, getLogoSrc } from "@/lib/portfolio";

export default function Page() {
  const groups = getItemsGroupedByCategory();
  const logoSrc = getLogoSrc();

  return <HomePage groups={groups} logoSrc={logoSrc} />;
}
