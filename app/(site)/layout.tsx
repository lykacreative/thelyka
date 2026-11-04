import type { Viewport } from "next";
import { SiteProvider } from "@/components/site/SiteProvider";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { ItemView } from "@/components/site/ItemView";
import { getSiteData } from "@/lib/site/data";
import { fontClasses, fontFaces } from "@/lib/site/fonts";
// The mockup's stylesheet in its own order (one file: the cascade depends on the order), then the site's own rules.
import "./styles/b2-night.css";
import "./styles/site-extra.css";

export const viewport: Viewport = {
  viewportFit: "cover"
};

// Every public page: the nav (with the record player, so the song keeps playing from page to page),
// the page, the footer, and the item view that opens any piece over any page.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { items, posts } = await getSiteData();
  return (
    <div className={`lyka-site ${fontClasses}`} style={fontFaces}>
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
