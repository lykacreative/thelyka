import type { Metadata } from "next";
// The admin keeps the site's old base styles (Tailwind) and its own look.
import "../globals.css";
import "./admin.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="lyka-admin">{children}</div>;
}
