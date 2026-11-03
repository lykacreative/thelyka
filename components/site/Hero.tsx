"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, pad2, type SiteItem } from "@/lib/site-items";
import { openItem, rng } from "@/lib/site/client";
import { useSite } from "./SiteProvider";
import { Crate, type CrateEntry, type CrateHandle } from "./Crate";
import { EmptyNote } from "./EmptyNote";
import { HeroLamp } from "./HeroLamp";
import { ArrowLeft, ArrowRight, ICONS, ICON_KEYS, Ico, TELEGRAM_URL, TelegramIcon } from "./icons";

export const DESIGN_YEAR_EVENT = "lyka:design-year";

// The scribbled loop behind the hero (the same every time).
const SCRIBBLE = (() => {
  const random = rng(5);
  const pts: number[][] = [];
  for (let i = 0; i < 16; i++) pts.push([40 + random() * 920, 40 + random() * 620]);
  pts.push(pts[0], pts[1], pts[2]);
  let d = `M${pts[1][0].toFixed(1)} ${pts[1][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 2; i++) {
    const [p0, p1, p2, p3] = [pts[i - 1], pts[i], pts[i + 1], pts[i + 2]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
})();

// The hand-cut confetti: 46 pieces on wide screens, the first 26 on phones (the CSS hides the rest).
const CONFETTI = (() => {
  const random = rng(11);
  return Array.from({ length: 46 }, (_, i) => {
    const x = random() * 100;
    const y = random() * 100;
    const rot = Math.round(random() * 60 - 30);
    const s = 0.75 + random() * 0.7;
    return { i, x, y, rot, s, icon: ICON_KEYS[i % ICON_KEYS.length] };
  });
})();

function Confetti({ hero }: { hero: React.RefObject<HTMLElement | null> }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const section = hero.current;
    const container = box.current;
    if (!section || !container) return;
    const pieces = CONFETTI.map((p) => ({ ...p, el: container.children[p.i] as HTMLElement, cx: 0, cy: 0 }));
    let cache = false;
    const rest = (p: (typeof pieces)[number]) => `rotate(${p.rot}deg) scale(${p.s})`;
    const measure = () => {
      const hb = section.getBoundingClientRect();
      pieces.forEach((p) => {
        const r = p.el.getBoundingClientRect();
        p.cx = r.left - hb.left + r.width / 2;
        p.cy = r.top - hb.top + r.height / 2;
      });
      cache = true;
    };
    const push = (x: number, y: number, rad: number) => {
      if (!cache) measure();
      pieces.forEach((p) => {
        const dx = p.cx - x;
        const dy = p.cy - y;
        const d = Math.hypot(dx, dy);
        if (d < rad) {
          const f = (1 - d / rad) * 46;
          const ux = dx / (d || 1);
          const uy = dy / (d || 1);
          p.el.style.transform = `translate(${ux * f}px,${uy * f}px) rotate(${p.rot + f * 3}deg) scale(${p.s * 1.25})`;
        } else p.el.style.transform = rest(p);
      });
    };
    const ac = new AbortController();
    section.addEventListener(
      "pointermove",
      (event) => {
        const hb = section.getBoundingClientRect();
        push(event.clientX - hb.left, event.clientY - hb.top, 130);
      },
      { signal: ac.signal }
    );
    section.addEventListener("pointerleave", () => pieces.forEach((p) => (p.el.style.transform = rest(p))), { signal: ac.signal });
    window.addEventListener("resize", () => (cache = false), { signal: ac.signal });
    return () => ac.abort();
  }, [hero]);

  return (
    <div className="confetti" ref={box} aria-hidden="true">
      {CONFETTI.map((p) => (
        <span
          key={p.i}
          className={`cf c${p.i % 6}${p.i >= 26 ? " cf-wide" : ""}`}
          style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `rotate(${p.rot}deg) scale(${p.s})` }}
        >
          <svg viewBox="0 0 16 16" dangerouslySetInnerHTML={{ __html: ICONS[p.icon] }} />
        </span>
      ))}
    </div>
  );
}

// Stickers drag anywhere inside the hero; a click without a drag follows the link.
function useStickers(hero: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = hero.current;
    if (!section) return;
    const ac = new AbortController();
    section.querySelectorAll<HTMLElement>("[data-stk]").forEach((sticker) => {
      let start: { x: number; y: number; sx: number; sy: number } | null = null;
      let dx = 0;
      let dy = 0;
      let moved = false;
      const opts = { signal: ac.signal };
      sticker.setAttribute("draggable", "false");
      sticker.addEventListener(
        "pointerdown",
        (event) => {
          if (event.button !== 0) return;
          start = { x: event.clientX - dx, y: event.clientY - dy, sx: event.clientX, sy: event.clientY };
          moved = false;
        },
        opts
      );
      sticker.addEventListener(
        "pointermove",
        (event) => {
          if (!start) return;
          if (!moved && Math.hypot(event.clientX - start.sx, event.clientY - start.sy) > 6) {
            moved = true;
            sticker.classList.add("dragging");
            try {
              sticker.setPointerCapture(event.pointerId);
            } catch {}
          }
          if (moved) {
            const hb = section.getBoundingClientRect();
            const r = sticker.getBoundingClientRect();
            let nx = event.clientX - start.x;
            let ny = event.clientY - start.y;
            const ox = r.left - dx;
            const oy = r.top - dy;
            nx = Math.min(Math.max(nx, hb.left - ox + 4), hb.right - ox - r.width - 4);
            ny = Math.min(Math.max(ny, hb.top - oy + 4), hb.bottom - oy - r.height - 4);
            dx = nx;
            dy = ny;
            sticker.style.setProperty("--dx", dx + "px");
            sticker.style.setProperty("--dy", dy + "px");
          }
        },
        opts
      );
      const end = () => {
        if (!start) return;
        start = null;
        sticker.classList.remove("dragging");
      };
      sticker.addEventListener("pointerup", end, opts);
      sticker.addEventListener("pointercancel", end, opts);
      sticker.addEventListener(
        "click",
        (event) => {
          if (moved) {
            event.preventDefault();
            event.stopImmediatePropagation();
            moved = false;
          }
        },
        { signal: ac.signal, capture: true }
      );
    });
    return () => ac.abort();
  }, [hero]);
}

function FeaturedCrate({ items }: { items: SiteItem[] }) {
  const crate = useRef<CrateHandle>(null);
  const entries = useMemo<CrateEntry[]>(() => items.map((item) => ({ kind: "item", item })), [items]);
  const [now, setNow] = useState(0);
  const item = items[now];
  return (
    <>
      <Crate
        ref={crate}
        entries={entries}
        label="Featured pieces"
        title="Featured"
        maxK={5}
        tabs
        eager={6}
        onChange={(index) => setNow(index)}
        onOpen={(it) => openItem(it.key)}
      />
      <div className="crate-ctl">
        <button className="rbtn" type="button" aria-label="Previous record" disabled={now === 0} onClick={() => crate.current?.prev()}>
          <ArrowLeft />
        </button>
        <div className="crate-now" aria-live="polite">
          <strong>{item?.title ?? ""}</strong>
          <span>{item ? `${pad2(now + 1)} / ${pad2(items.length)} · ${formatDate(item.date)}` : ""}</span>
        </div>
        <button className="rbtn" type="button" aria-label="Next record" disabled={now >= items.length - 1} onClick={() => crate.current?.next()}>
          <ArrowRight />
        </button>
        <button className="pill y" type="button" onClick={() => crate.current?.activate()}>
          Open
        </button>
      </div>
      <p className="hint">drag · scroll · ← → · click the front to open</p>
    </>
  );
}

// The top of the home page: the logotype, stickers, confetti and the featured crate (the admin's
// Featured list, in its order).
export function Hero({ featuredKeys }: { featuredKeys: string[] }) {
  const { items, byKey } = useSite();
  const hero = useRef<HTMLElement>(null);
  const [spun, setSpun] = useState(false);
  const featured = useMemo(() => featuredKeys.map((key) => byKey.get(key)).filter((item): item is SiteItem => !!item), [featuredKeys, byKey]);
  const maxYear = useMemo(() => items.map((item) => item.year).filter(Boolean).sort().reverse()[0] ?? "", [items]);
  useStickers(hero);

  return (
    <section className="hero" id="top" aria-label="Lyka Mimics" ref={hero}>
      <svg className="scribble" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
        <path d={SCRIBBLE} />
      </svg>
      <Confetti hero={hero} />
      <div className="hero-grid">
        <div className="hero-type">
          <p className="kicker">
            <i className="mark" style={{ width: 14, height: 14 }} aria-hidden="true" />
            Design · Art · Reviews · Blog
          </p>
          <div className="logo-wrap">
            <h1 className="logo">
              <span className="logo-l1">Lyka</span>
              <span className="logo-l2">Mimics</span>
            </h1>
            <button className={`logo-mark${spun ? " spun" : ""}`} type="button" aria-label="Spin the Lyka Mimics mark" onClick={() => setSpun((v) => !v)}>
              <i className="mark" aria-hidden="true" />
            </button>
            <span className="px" aria-hidden="true" />
          </div>
          <p className="intro">
            I make art, posters, and edits. <mark>I hope you enjoy what I have to offer.</mark>
          </p>
          <div className="hero-cta">
            <a className="pill" href="#design">
              Dig in{" "}
              <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 2v11M3.5 8.5 8 13l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
              </svg>
            </a>
            <a className="pill alt" href="#about">
              About
            </a>
          </div>
          <a className="stk g s-design" href="#design" data-stk style={{ ["--r" as string]: "-9deg" }}>
            <span className="stk-in">
              <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
                <rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              Design
            </span>
          </a>
          <a className="stk r s-art" href="#art" data-stk style={{ ["--r" as string]: "7deg" }}>
            <span className="stk-in">
              <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
                <g fill="currentColor">
                  <circle cx="8" cy="4" r="2.6" />
                  <circle cx="12" cy="7" r="2.6" />
                  <circle cx="10.5" cy="12" r="2.6" />
                  <circle cx="5.5" cy="12" r="2.6" />
                  <circle cx="4" cy="7" r="2.6" />
                </g>
              </svg>
              Art
            </span>
          </a>
          {maxYear ? (
          <a
            className="stk c s-year"
            href="#design"
            data-stk
            data-year
            style={{ ["--r" as string]: "-6deg" }}
            aria-label={`${maxYear} designs`}
            onClick={() => window.dispatchEvent(new CustomEvent(DESIGN_YEAR_EVENT, { detail: maxYear }))}
          >
            <span className="stk-in">
              <Ico name="smile" />
              {maxYear}
            </span>
          </a>
          ) : null}
          <a className="stk y s-rev" href="#reviews" data-stk style={{ ["--r" as string]: "-5deg" }}>
            <span className="stk-in">
              <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 1l1.8 4.6 4.9.3-3.8 3.1 1.2 4.8L8 11.1 3.9 13.8l1.2-4.8L1.3 5.9l4.9-.3z" fill="currentColor" />
              </svg>
              Reviews
            </span>
          </a>
          <a className="stk l s-blog" href="#blog" data-stk style={{ ["--r" as string]: "8deg" }}>
            <span className="stk-in">
              <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 13l1-3.6L11.2 2.2a1.4 1.4 0 0 1 2 2L6 11.4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              Blog
            </span>
          </a>
          <a
            className="stk b s-tg"
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener"
            data-stk
            style={{ ["--r" as string]: "5deg" }}
            aria-label="Telegram (opens in a new tab)"
          >
            <span className="stk-in">
              <TelegramIcon />
              Telegram
            </span>
          </a>
        </div>
        <div className="hero-crate">
          <HeroLamp />
          {featured.length ? (
            <FeaturedCrate items={featured} />
          ) : (
            <EmptyNote title="The crate is empty for now." className="crate-empty">
              New designs are on their way.
            </EmptyNote>
          )}
        </div>
      </div>
    </section>
  );
}
