"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { section: string; children: ReactNode };

// A link to a section of the home page: a smooth in-page jump on the home page ("#design"),
// a normal page change from anywhere else ("/#design").
export function SectionLink({ section, children, ...rest }: Props) {
  const home = usePathname() === "/";
  if (home) {
    return (
      <a href={`#${section}`} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={section === "top" ? "/" : `/#${section}`} {...rest}>
      {children}
    </Link>
  );
}
