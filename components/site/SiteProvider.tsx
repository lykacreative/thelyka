"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { SiteItem } from "@/lib/site-items";
import { openItem, reducedMotion } from "@/lib/site/client";

type SiteData = {
  items: SiteItem[];
  byKey: Map<string, SiteItem>;
};

const SiteContext = createContext<SiteData>({ items: [], byKey: new Map() });

export function useSite() {
  return useContext(SiteContext);
}

// Holds every item once for the whole site (the item view opens any of them on any page), and makes
// in-page links behave: "#design" scrolls smoothly and keeps Next.js's history state, and anything with
// data-open="<key>" opens that item over the page.
export function SiteProvider({ items, children }: { items: SiteItem[]; children: ReactNode }) {
  const value = useMemo(() => ({ items, byKey: new Map(items.map((item) => [item.key, item])) }), [items]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as Element | null;

      const opener = target?.closest<HTMLElement>("[data-open]");
      if (opener?.dataset.open && value.byKey.has(opener.dataset.open)) {
        event.preventDefault();
        openItem(opener.dataset.open);
        return;
      }

      const link = target?.closest<HTMLAnchorElement>("a[href]");
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      const here = window.location;
      if (url.origin !== here.origin || url.pathname !== here.pathname || url.search !== here.search) return;
      if (!url.hash || url.hash.startsWith("#/")) return;
      const id = decodeURIComponent(url.hash.slice(1));
      const element = document.getElementById(id);
      if (!element) return;
      event.preventDefault();
      if (url.hash !== here.hash) window.history.pushState(null, "", url.hash);
      element.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [value]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
