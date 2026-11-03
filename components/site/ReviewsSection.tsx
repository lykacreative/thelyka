"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { coverOf, formatDate } from "@/lib/site-items";
import { reviewSlugByType, reviewTypes, type ReviewType } from "@/lib/review-types";
import { rng } from "@/lib/site/client";
import { useSite } from "./SiteProvider";

const RSTEP = 10;

// "M012: Spirited Away" -> code "M012", name "Spirited Away"; "Book 3: Dune" -> "Book 3", "Dune".
function splitCode(title: string) {
  const match = title.match(/^([A-Z]\d{3}|Book \d+):\s*(.+)$/);
  return match ? { code: match[1], name: match[2] } : { code: "", name: title };
}

function PaperStar({ style }: { style: React.CSSProperties }) {
  const [turn, setTurn] = useState(0);
  return (
    <button className="paperstar" type="button" style={{ ...style, transform: turn ? `rotate(${turn}deg)` : undefined }} aria-label="Spin star" onClick={() => setTurn((t) => t + 144)}>
      <i />
    </button>
  );
}

// Reviews: the cutting mat, Movies and Books as tabs, ten at a time. On /reviews/<type> the tabs
// keep the address in step (syncPath).
export function ReviewsSection({ initialType = "Movies", syncPath = false, heading = "h2" }: { initialType?: ReviewType; syncPath?: boolean; heading?: "h1" | "h2" }) {
  const { items } = useSite();
  const byType = useMemo(() => {
    const reviews = items.filter((item) => item.category === "reviews");
    return Object.fromEntries(reviewTypes.map((type) => [type, reviews.filter((item) => item.type === type)])) as Record<ReviewType, typeof reviews>;
  }, [items]);
  const tilt = useMemo(() => {
    const random = rng(9);
    return new Map(reviewTypes.flatMap((type) => byType[type].map((item) => [item.key, (random() * 5 - 2.5).toFixed(1)] as const)));
  }, [byType]);
  const [type, setType] = useState<ReviewType>(initialType);
  const [shown, setShown] = useState(RSTEP);
  const grid = useRef<HTMLUListElement>(null);
  const focusAt = useRef<number | null>(null);

  useEffect(() => {
    const index = focusAt.current;
    if (index === null) return;
    focusAt.current = null;
    grid.current?.querySelectorAll<HTMLElement>(".rv-btn")[index]?.focus({ preventScroll: true });
  }, [shown]);

  const choose = (next: ReviewType, focus = false) => {
    setType(next);
    setShown(RSTEP);
    if (syncPath) window.history.replaceState(window.history.state, "", `/reviews/${reviewSlugByType[next]}`);
    if (focus) document.getElementById(`rvt-${reviewTypes.indexOf(next)}`)?.focus();
  };

  const list = byType[type];
  const left = list.length - shown;
  const Heading = heading;

  return (
    <section className="sec reviews" id="reviews" aria-labelledby="reviews-h">
      <div className="ruler" aria-hidden="true" />
      <PaperStar style={{ right: "6%", top: 70 }} />
      <PaperStar style={{ left: "3%", bottom: 90, width: 34, height: 34 }} />
      <div className="wrap">
        <div className="rv-head">
          <Heading className="rv-h" id="reviews-h">
            <span className="lab w">Reviews</span>
            <span className="lab y">watchlist</span>
          </Heading>
          <p className="rv-sub">{reviewTypes.map((t) => `${t} ${byType[t].length}`).join(" · ")}</p>
          <div
            className="toggle"
            role="tablist"
            aria-label="Review type"
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              event.preventDefault();
              const i = (reviewTypes.indexOf(type) + 1) % reviewTypes.length;
              choose(reviewTypes[i], true);
            }}
          >
            {reviewTypes.map((t, i) => (
              <button
                key={t}
                className="ttab"
                role="tab"
                type="button"
                id={`rvt-${i}`}
                aria-selected={t === type}
                aria-controls="rv-grid"
                tabIndex={t === type ? 0 : -1}
                onClick={() => choose(t)}
              >
                {t}
                <b>{byType[t].length}</b>
              </button>
            ))}
          </div>
        </div>
        <ul className="rv-grid" id="rv-grid" role="tabpanel" aria-labelledby={`rvt-${reviewTypes.indexOf(type)}`} ref={grid}>
          {list.slice(0, shown).map((item) => {
            const c = splitCode(item.title);
            const cover = coverOf(item);
            return (
              <li className="rv" key={item.key} style={{ ["--r" as string]: `${tilt.get(item.key)}deg` }}>
                <button className="rv-btn" type="button" data-open={item.key} aria-label={item.title}>
                  <span className="tape a" />
                  <span className="tape b" />
                  <img src={cover.src} width={cover.w} height={cover.h} loading="lazy" decoding="async" alt={item.title} />
                </button>
                {c.code ? <span className="rv-code">{c.code}</span> : null}
                <span className="rv-name">{c.name}</span>
                <span className="rv-date">{formatDate(item.date)}</span>
              </li>
            );
          })}
        </ul>
        <button
          className="pill alt more"
          type="button"
          hidden={left <= 0}
          onClick={() => {
            focusAt.current = shown;
            setShown((s) => s + RSTEP);
          }}
        >
          Show {Math.min(RSTEP, Math.max(0, left))} more
        </button>
      </div>
    </section>
  );
}
