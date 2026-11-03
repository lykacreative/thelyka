import type { Viewport } from "next";
import { Ballet, Bricolage_Grotesque, Space_Mono } from "next/font/google";
import { SiteProvider } from "@/components/site/SiteProvider";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ItemView } from "@/components/site/ItemView";
import { getSiteData } from "@/lib/site/data";
// The mockup's stylesheet in its own order (one file: the cascade depends on the order), then the site's own rules.
import "./styles/b2-night.css";
import "./styles/site-extra.css";

// The site's three faces, self-hosted: Ballet (the script headings), Bricolage Grotesque (everything else,
// with its width axis for the condensed titles) and Space Mono (labels, dates, counts).
const ballet = Ballet({ subsets: ["latin"], axes: ["opsz"], variable: "--font-ballet", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz", "wdth"], variable: "--font-bricolage", display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });

// Each face's own family name, without the metric-matched Arial stand-in next/font puts after it (Turbopack keeps
// that stand-in even with adjustFontFallback: false). The stylesheet's stacks use these, so glyphs a face doesn't
// have (the arrows in the hints) fall back to the same fonts as in the mockup, and lines measure and wrap the same.
const familyOf = (font: { style: { fontFamily: string } }) => font.style.fontFamily.split(",")[0].trim();
const faces = {
  "--face-ballet": familyOf(ballet),
  "--face-bricolage": familyOf(bricolage),
  "--face-space-mono": familyOf(spaceMono)
} as React.CSSProperties;

export const viewport: Viewport = {
  viewportFit: "cover"
};

// Every public page: the nav (with the record player, so the song keeps playing from page to page),
// the page, the footer, and the item view that opens any piece over any page.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { items, posts } = await getSiteData();
  return (
    <div className={`lyka-site ${ballet.variable} ${bricolage.variable} ${spaceMono.variable}`} style={faces}>
      <SiteProvider items={items}>
        <a className="vh skip" href="#main">
          Skip to the content
        </a>
        <Nav />
        {children}
        <Footer items={items} postCount={posts.length} />
        <ItemView />
      </SiteProvider>
    </div>
  );
}
