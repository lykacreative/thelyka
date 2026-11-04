import type { CSSProperties } from "react";
import { Ballet, Bricolage_Grotesque, Space_Mono } from "next/font/google";

// The site's three faces, self-hosted: Ballet (the script headings), Bricolage Grotesque (everything else,
// with its width axis for the condensed titles) and Space Mono (labels, dates, counts). Shared by the public
// site, the admin (which wears the site's look) and the admin's blog preview.
const ballet = Ballet({ subsets: ["latin"], axes: ["opsz"], variable: "--font-ballet", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], axes: ["opsz", "wdth"], variable: "--font-bricolage", display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });

/** The classes that load the three faces. */
export const fontClasses = `${ballet.variable} ${bricolage.variable} ${spaceMono.variable}`;

// Each face's own family name, without the metric-matched Arial stand-in next/font puts after it (Turbopack keeps
// that stand-in even with adjustFontFallback: false). The stylesheet's stacks use these, so glyphs a face doesn't
// have (the arrows in the hints) fall back to the same fonts as in the mockup, and lines measure and wrap the same.
const familyOf = (font: { style: { fontFamily: string } }) => font.style.fontFamily.split(",")[0].trim();
export const fontFaces = {
  "--face-ballet": familyOf(ballet),
  "--face-bricolage": familyOf(bricolage),
  "--face-space-mono": familyOf(spaceMono)
} as CSSProperties;
