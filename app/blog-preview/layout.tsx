import type { Metadata } from "next";
import { fontClasses, fontFaces } from "@/lib/site/fonts";
// The public site's stylesheet, as on the site (no admin or old-site styles), so the preview is the page.
import "../(site)/styles/b2-night.css";
import "../(site)/styles/site-extra.css";
import "./preview.css";

export const metadata: Metadata = {
  title: "preview",
  robots: { index: false, follow: false }
};

// The admin's blog preview frame (lib/blog-preview.ts): the post page without the nav, player and footer.
export default function BlogPreviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lyka-site ${fontClasses}`} style={fontFaces}>
      {children}
    </div>
  );
}
