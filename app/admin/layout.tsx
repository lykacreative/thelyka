import type { Metadata } from "next";
import { fontClasses, fontFaces } from "@/lib/site/fonts";
// The site's old base styles (Tailwind) for the admin's layout utilities, then the public site's stylesheet and
// the admin's own rules on top, so the admin wears the site's look (Day and Night).
import "../globals.css";
import "../(site)/styles/b2-night.css";
import "../(site)/styles/site-extra.css";
import "./admin.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lyka-admin ${fontClasses}`} style={fontFaces}>
      {children}
    </div>
  );
}
