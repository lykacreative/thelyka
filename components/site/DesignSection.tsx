"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { coverOf, formatDate, newestItem, type SiteItem } from "@/lib/site-items";
import { reducedMotion, rng } from "@/lib/site/client";
import { useSite } from "./SiteProvider";
import { DESIGN_YEAR_EVENT } from "./Hero";
import { DesignShelfView } from "./DesignShelfView";

const WALL_STEP = 24;

// The Wall view: every year's designs as a grid of cards, "Show more" per year.
function DesignWall({ design, years, hidden }: { design: SiteItem[]; years: string[]; hidden: boolean }) {
  const byYear = useMemo(() => Object.fromEntries(years.map((year) => [year, design.filter((item) => item.year === year)])), [design, years]);
  const [shown, setShown] = useState<Record<string, number>>(() =>
    Object.fromEntries(years.map((year, i) => [year, i === 0 ? Math.min(byYear[year].length, WALL_STEP) : 18]))
  );
  const focusNext = useRef<{ year: string; index: number } | null>(null);
  const wall = useRef<HTMLDivElement>(null);
  // a slight tilt per card, the same on every visit
  const tilt = useMemo(() => {
    const random = rng(3);
    return new Map(years.flatMap((year) => byYear[year].map((item) => [item.key, (random() * 4 - 2).toFixed(1)] as const)));
  }, [byYear, years]);
  const newest = useMemo(() => {
    const all = newestItem(design);
    return all?.key;
  }, [design]);

  useEffect(() => {
    const next = focusNext.current;
    if (!next) return;
    focusNext.current = null;
    wall.current?.querySelectorAll<HTMLElement>(`#wall-${next.year} .wcard`)[next.index]?.focus({ preventScroll: true });
  }, [shown]);

  return (
    <div id="d-wall" ref={wall} hidden={hidden}>
      {years.map((year) => {
        const list = byYear[year];
        const count = shown[year] ?? 0;
        const left = list.length - count;
        return (
          <div className="wall-group" id={`wall-${year}`} key={year}>
            <div className="wall-div">
              <span>{year}</span>
              <b>{list.length} designs</b>
            </div>
            <ul className="wall" data-y={year}>
              {list.slice(0, count).map((item) => {
                const cover = coverOf(item);
                return (
                  <li key={item.key}>
                    <button className="wcard" type="button" data-open={item.key} style={{ ["--r" as string]: `${tilt.get(item.key)}deg` }}>
                      {item.key === newest ? <span className="newest">newest</span> : null}
                      <span className="wimg">
                        <img src={cover.src} width={cover.w} height={cover.h} loading="lazy" decoding="async" alt={item.title} />
                      </span>
                      <span className="wt">{item.title}</span>
                      <span className="wd">{formatDate(item.date)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              className="pill alt more"
              type="button"
              hidden={left <= 0}
              onClick={() => {
                focusNext.current = { year, index: count };
                setShown((s) => ({ ...s, [year]: (s[year] ?? 0) + WALL_STEP }));
              }}
            >
              Show {Math.min(WALL_STEP, Math.max(0, left))} more
            </button>
          </div>
        );
      })}
    </div>
  );
}

// Design: by year, in two views: the Shelf (round 3 of the mockup, its own component) and the Wall.
export function DesignSection({ heading = "h2" }: { heading?: "h1" | "h2" }) {
  const { items } = useSite();
  const design = useMemo(() => items.filter((item) => item.category === "design"), [items]);
  const years = useMemo(() => [...new Set(design.map((item) => item.year))].filter(Boolean).sort().reverse(), [design]);
  const [view, setView] = useState<"shelf" | "wall">("shelf");
  const [shelfYear, setShelfYear] = useState(years[0] ?? "");
  const [wallYear, setWallYear] = useState(years[0] ?? "");
  const viewRef = useRef(view);
  viewRef.current = view;

  // The hero's year sticker puts that year on the shelf.
  useEffect(() => {
    const onYearSticker = (event: Event) => {
      const wanted = String((event as CustomEvent).detail ?? "");
      if (viewRef.current === "shelf" && years.includes(wanted)) setShelfYear(wanted);
    };
    window.addEventListener(DESIGN_YEAR_EVENT, onYearSticker);
    return () => window.removeEventListener(DESIGN_YEAR_EVENT, onYearSticker);
  }, [years]);

  const year = view === "shelf" ? shelfYear : wallYear;

  const Heading = heading;
  const span = years.length ? `${years[years.length - 1]}–${years[0]}` : "";

  return (
    <section className="sec design" id="design" aria-labelledby="design-h">
      <div className="wrap">
        <div className="sec-head">
          <Heading className="script" id="design-h">
            Design
          </Heading>
          <span className="count-oval">{`${design.length} pieces · ${span}`}</span>
          <div className="seg" role="group" aria-label="View">
            <button type="button" aria-pressed={view === "shelf"} onClick={() => setView("shelf")}>
              <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M1 14.5h14M1 8.5h14" stroke="currentColor" strokeWidth="1.8" />
                <path d="M2.5 3h2v5.5h-2zM5.5 2h2v6.5h-2zM9 3.6l1.9-.6 1.6 5-1.9.6zM2.5 10h2v4.5h-2zM5.5 10.5h2v4h-2z" fill="currentColor" />
              </svg>
              Shelf
            </button>
            <button type="button" aria-pressed={view === "wall"} onClick={() => setView("wall")}>
              <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" fill="currentColor" />
              </svg>
              Wall
            </button>
          </div>
        </div>
        <div className="years" role="group" aria-label="Year">
          {years.map((y) => (
            <button
              key={y}
              className="ytab"
              type="button"
              aria-pressed={y === year}
              onClick={() => {
                if (view === "shelf") setShelfYear(y);
                else {
                  setWallYear(y);
                  document.getElementById(`wall-${y}`)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
                }
              }}
            >
              {y}
              <b>{design.filter((item) => item.year === y).length}</b>
            </button>
          ))}
        </div>
        <DesignShelfView key={shelfYear} design={design} year={shelfYear} hidden={view !== "shelf"} />
        <DesignWall design={design} years={years} hidden={view !== "wall"} />
      </div>
    </section>
  );
}
