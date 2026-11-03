"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeSwitch } from "./ThemeSwitch";
import { Player } from "./Player";
import { SectionLink } from "./SectionLink";
import { TELEGRAM_URL, TelegramIcon } from "./icons";
import { notePage } from "@/lib/site/client";

const SECTIONS = [
  { id: "design", label: "Design" },
  { id: "art", label: "Art" },
  { id: "reviews", label: "Reviews" },
  { id: "blog", label: "Blog" },
  { id: "about", label: "About" }
] as const;

// The page a standalone address belongs to: /design, /arts/..., /reviews/..., /blogs/...
function sectionOfPath(path: string) {
  if (path.startsWith("/design")) return "design";
  if (path.startsWith("/arts")) return "art";
  if (path.startsWith("/reviews")) return "reviews";
  if (path.startsWith("/blogs")) return "blog";
  return null;
}

// Labels drop out step by step (switch text, Telegram text, tighter links, brand name) until every link shows.
const FIT = ["fit1", "fit2", "fit3", "fit4", "fit5", "fit6", "fit7", "fit8", "fit9"];

// The nav at the very top of every page: brand, sections, Day/Night, the record player, Telegram.
// Round 3 of the mockup reworks how it fits at every width: kept as its own component.
export function Nav() {
  const pathname = usePathname();
  const home = pathname === "/";
  const nav = useRef<HTMLElement>(null);
  const links = useRef<HTMLDivElement>(null);
  const [spy, setSpy] = useState<string | null>(null);

  // Page changes inside the site (the fanzine pages' Back uses it).
  useEffect(() => {
    notePage();
  }, [pathname]);

  // Home: the section in view lights up its link.
  useEffect(() => {
    if (!home) return;
    const update = () => {
      const y = window.innerHeight * 0.4;
      let on: string | null = null;
      SECTIONS.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= y) on = id;
      });
      const foot = document.getElementById("foot");
      if (foot && foot.getBoundingClientRect().top < window.innerHeight * 0.5) on = "about";
      setSpy(on);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [home]);

  // Every link always fits.
  useEffect(() => {
    const element = nav.current;
    const row = links.current;
    if (!element || !row) return;
    const fit = () => {
      element.classList.remove(...FIT);
      for (let i = 0; i < FIT.length && row.scrollWidth > row.clientWidth + 1; i++) element.classList.add(FIT[i]);
    };
    const resize = window.ResizeObserver ? new ResizeObserver(() => fit()) : null;
    resize?.observe(element);
    window.addEventListener("resize", fit);
    const player = element.querySelector(".player");
    const watch = new MutationObserver(fit);
    if (player) watch.observe(player, { attributes: true, attributeFilter: ["class"] });
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.fonts?.ready.then(fit).catch(() => {});
    fit();
    return () => {
      resize?.disconnect();
      watch.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  const active = home ? spy : sectionOfPath(pathname);

  return (
    <nav className="nav" aria-label="Sections" ref={nav}>
      <SectionLink className="brand" section="top" aria-label={home ? "Lyka Mimics, back to top" : "Lyka Mimics, home"}>
        <i className="mark" aria-hidden="true" />
        <span>Lyka Mimics</span>
      </SectionLink>
      <div className="nav-links" ref={links}>
        {SECTIONS.map(({ id, label }) => (
          <SectionLink key={id} section={id} className={active === id ? "on" : undefined} aria-current={active === id ? "true" : undefined}>
            {label}
          </SectionLink>
        ))}
      </div>
      <ThemeSwitch />
      <Player />
      <a className="pill b nav-tg" href={TELEGRAM_URL} target="_blank" rel="noopener" aria-label="Telegram (opens in a new tab)">
        <TelegramIcon />
        <span>Telegram</span>
      </a>
    </nav>
  );
}
