"use client";
/* eslint-disable @next/next/no-img-element */

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { coverOf, formatDate, pad2, type SiteItem } from "@/lib/site-items";
import { openItem } from "@/lib/site/client";
import { music } from "@/lib/site/music";
import { purr } from "@/lib/site/purr";
import { PROP, PROP_POOL, VP_PAUSE, VP_PLAY } from "./shelf-props";

type Props = {
  design: SiteItem[];
  year: string;
  hidden: boolean;
};

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

// The shelf's turntable shows the nav player's song and state: its record, its title on the button, spinning while
// the song plays. Read from the shared player each time (the player may come up after the shelf).
function syncRecords(ul: HTMLElement | null) {
  if (!ul) return;
  const { playing, track } = music.get();
  ul.querySelectorAll<HTMLElement>(".pr-record").forEach((deck) => {
    deck.classList.toggle("on", playing);
    const img = deck.querySelector<HTMLImageElement>(".vp-lbl img");
    if (img && track && img.getAttribute("src") !== track.cover) img.src = track.cover;
    const button = deck.querySelector<HTMLButtonElement>(".vp-btn");
    if (!button) return;
    button.setAttribute("aria-label", playing ? "Pause" : track ? `Play ${track.title}` : "Play the record");
    const icon = button.querySelector("svg");
    const shape = playing ? VP_PAUSE : VP_PLAY;
    if (icon && icon.innerHTML !== shape) icon.innerHTML = shape;
  });
}

// One sleeve. Only the sleeve that comes out and the one that goes back redraw when the pointer moves along
// the shelf (a whole year redrawing on every sleeve made the shelf stutter).
const Sleeve = memo(function Sleeve({ item, i, on, hidden, code }: { item: SiteItem; i: number; on: boolean; hidden: boolean; code: string }) {
  const image = coverOf(item);
  return (
    <li className="sp" hidden={hidden}>
      <button className={`spine${on ? " on" : ""}`} type="button" data-i={i} tabIndex={on ? 0 : -1} aria-label={`${item.title}, ${formatDate(item.date)}`}>
        <img src={image.src} width={image.w} height={image.h} loading="lazy" decoding="async" alt="" draggable={false} />
        <span className="sp-code" aria-hidden="true">
          {code}
        </span>
      </button>
    </li>
  );
});

// The Design section's Shelf view: the year's designs stand upright on shelves. Point at a sleeve to pull it
// out (touch: tap), click to open it; arrow keys move along the shelf. A short year fills its shelf: the
// sleeves grow, the cabinet keeps up with the preview card, and the space left gets a bookend and props that
// react when pointed at or tapped. Round 3 of the mockup.
export function DesignShelfView({ design, year, hidden }: Props) {
  const list = useMemo(() => design.filter((item) => item.year === year), [design, year]);
  const position = useMemo(() => new Map(design.map((item, i) => [item.key, i + 1])), [design]);
  const codeOf = useCallback(
    (item: SiteItem) => {
      const match = /^D\d{2,4}(?=\s*:)/.exec(item.title);
      return match ? match[0] : `N°${pad2(position.get(item.key) ?? 0)}`;
    },
    [position]
  );
  const root = useRef<HTMLDivElement>(null);
  const unit = useRef<HTMLDivElement>(null);
  const spines = useRef<HTMLUListElement>(null);
  const preview = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [cur, setCur] = useState(0);
  const [all, setAll] = useState(false);
  const allRef = useRef(all);
  // per: sleeves on one shelf; cap: how many stand out before "Pull out the rest"
  const [fit, setFit] = useState({ per: 1, cap: Infinity });
  const pointer = useRef("");
  const was = useRef(-1);
  const focusAfter = useRef<number | null>(null);
  const lastWidth = useRef(0);

  // Sizes the sleeves to the shelf and fills what's left (the mockup's shFit, step for step). The bookend and
  // props are drawn straight into the shelf after the sleeves; React never adds sleeves to this list once it's
  // up (a new year mounts a new shelf), so the two never cross.
  const refit = useCallback(() => {
    const ul = spines.current;
    const box = unit.current;
    const grid = root.current;
    const card = preview.current;
    const h3 = titleRef.current;
    const first = ul?.querySelector<HTMLElement>("li.sp");
    if (!ul || !box || !grid || !card || !h3 || !first || !ul.clientWidth) return;
    lastWidth.current = ul.clientWidth;
    ul.querySelectorAll(".sh-run").forEach((run) => run.remove());
    box.style.removeProperty("--sw");
    box.style.removeProperty("--sh");
    const cs = getComputedStyle(ul);
    const us = getComputedStyle(box);
    const cg = parseFloat(cs.columnGap) || 0;
    const W = ul.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 0.5; // exact, with a hair to spare
    const sw0 = first.offsetWidth;
    const sh0 = first.offsetHeight;
    const gp = parseFloat(us.getPropertyValue("--gp")) || 0;
    const pl = parseFloat(us.getPropertyValue("--pl")) || 0;
    const side = getComputedStyle(grid).gridTemplateColumns.split(" ").length > 1;
    const shMax = sh0 * 1.5;
    const sleeves = Array.from(ul.querySelectorAll<HTMLLIElement>("li.sp"));
    const n = sleeves.length;
    const per0 = Math.max(1, Math.floor((W + cg) / (sw0 + cg)));
    // few designs: the sleeves grow (up to a cap) until they fill the shelf; a full year keeps today's size
    let sw = sw0;
    let sh = sh0;
    if (n < per0) {
      sw = Math.max(sw0, Math.min(sw0 * (side ? 2.4 : 2), Math.floor(((W + cg) / n - cg) * 100) / 100));
      sh = Math.min(shMax, sh0 * Math.sqrt(sw / sw0));
    }
    const per = Math.max(1, Math.floor((W + cg) / (sw + cg) + 1e-6));
    const cap = allRef.current ? Infinity : per * (window.innerWidth < 720 ? 3 : 4);
    sleeves.forEach((li, j) => {
      li.hidden = j >= cap;
    });
    const shown = Math.min(cap, n);
    const rows = Math.ceil(shown / per);
    // the cabinet is never shorter than the preview card beside it: taller shelves first, then a shelf of props
    let extra = 0;
    if (side) {
      const lh = parseFloat(getComputedStyle(h3).lineHeight) || 32;
      const P = card.offsetHeight - h3.offsetHeight + 3 * lh - 6;
      const need = (r: number) => P / r - gp - pl;
      while (need(rows + extra) > shMax && extra < 4) extra++;
      sh = Math.max(sh, need(rows + extra));
    }
    sh = Math.round(sh * 10) / 10;
    if (sw !== sw0) box.style.setProperty("--sw", sw + "px");
    if (sh !== sh0) box.style.setProperty("--sh", sh + "px");
    // whatever shelf space is left gets a few props
    let free = W - ((shown - (rows - 1) * per) * (sw + cg) - cg) - cg;
    if (rows === 1 && free > 0 && free < 34) {
      // too little for a bookend: the sleeves take it
      sw = Math.floor((sw + free / shown) * 100) / 100;
      box.style.setProperty("--sw", sw + "px");
      free = 0;
    }
    type Run = { el: HTMLElement; items: string[]; used: number; w: number };
    const runs: Run[] = [];
    const addRun = (kind: "tail" | "row") => {
      const li = document.createElement("li");
      li.className = "sh-run " + kind;
      li.setAttribute("role", "none");
      li.innerHTML =
        (kind === "tail" ? `<span class="prop pr-bk" aria-hidden="true" style="width:${Math.round(Math.min(sh * PROP.bk[0], free - 14))}px">${PROP.bk[1]}</span>` : "") +
        '<span class="rest"></span>';
      ul.appendChild(li);
      runs.push({ el: li.querySelector<HTMLElement>(".rest")!, items: [], used: 0, w: 0 });
    };
    if (free >= 34) addRun("tail");
    for (let i = 0; i < extra; i++) addRun("row");
    runs.forEach((run) => {
      run.w = run.el.clientWidth;
    });
    PROP_POOL.forEach((key) => {
      const w = Math.round(sh * PROP[key][0]);
      let best: Run | null = null;
      runs.forEach((run) => {
        const room = run.w - run.used - 10 - 14 * run.items.length;
        if (w <= room && (!run.items.length || run.used + w <= run.w * 0.7) && (!best || run.w - run.used > best.w - best.used)) best = run;
      });
      if (best) {
        (best as Run).items.push(key);
        (best as Run).used += w;
      }
    });
    // the turntable is the one prop you can use (its play button), so it alone isn't hidden from screen readers
    runs.forEach((run) => {
      run.el.innerHTML = run.items
        .map((key) => {
          const w = Math.round(sh * PROP[key][0]);
          return key === "record"
            ? `<span class="prop pr-record" style="width:${w}px;--u:${(w / 100).toFixed(3)}px">${PROP[key][1]}</span>`
            : `<span class="prop pr-${key}" aria-hidden="true" style="width:${w}px">${PROP[key][1]}</span>`;
        })
        .join("");
    });
    syncRecords(ul);
    setFit((f) => (f.per === per && f.cap === cap ? f : { per, cap }));
  }, []);

  useIsoLayoutEffect(() => {
    allRef.current = all;
    refit();
  }, [refit, all]);

  // the turntable follows the song, whichever control started or stopped it
  useEffect(() => {
    syncRecords(spines.current);
    return music.subscribe(() => syncRecords(spines.current));
  }, []);

  // Refit when the shelf's width changes; after the observer returns, since the refit changes the shelf's
  // own height (the mockup hit a ResizeObserver loop without the wait). And once the fonts are in.
  useEffect(() => {
    const element = spines.current;
    if (!element) return;
    let timer = 0;
    const observer = window.ResizeObserver
      ? new ResizeObserver(() => {
          if (element.clientWidth && element.clientWidth !== lastWidth.current) {
            window.clearTimeout(timer);
            timer = window.setTimeout(refit, 0);
          }
        })
      : null;
    observer?.observe(element);
    let live = true;
    document.fonts?.ready.then(() => live && refit()).catch(() => {});
    return () => {
      live = false;
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [refit]);

  const cap = all ? Infinity : fit.cap;
  const left = list.length - Math.min(cap, list.length);

  const pull = (i: number, focus = false) => {
    if (!list.length) return;
    const next = Math.max(0, Math.min(list.length - 1, i));
    if (next >= cap) setAll(true);
    setCur(next);
    if (focus) focusAfter.current = next;
  };

  useEffect(() => {
    const index = focusAfter.current;
    if (index === null) return;
    focusAfter.current = null;
    spines.current?.querySelectorAll<HTMLElement>(".spine")[index]?.focus({ preventScroll: true });
  });

  // the props react when touched or pointed at: the cat wakes, the turntable wobbles, the plant sways (a tap on the
  // turntable is for its button, so it doesn't wobble then)
  const poke = (target: EventTarget, tap = false) => {
    const prop = (target as Element).closest?.(".prop");
    if (!prop || prop.classList.contains("poke") || (tap && prop.classList.contains("pr-record"))) return;
    prop.classList.add("poke");
    window.setTimeout(() => prop.classList.remove("poke"), 1500);
  };

  const item = list[Math.min(cur, Math.max(0, list.length - 1))];
  const cover = item ? coverOf(item) : null;

  return (
    <div className="d-shelf" ref={root} hidden={hidden}>
      <div className="sh-col">
        <div className="sh-unit" ref={unit}>
          <ul
            className="spines"
            ref={spines}
            aria-label={`${year}: ${list.length} designs on the shelf`}
            onPointerOver={(event) => {
              if (event.pointerType !== "mouse") return;
              poke(event.target);
              const spine = (event.target as Element).closest<HTMLElement>(".spine");
              if (spine && Number(spine.dataset.i) !== cur) pull(Number(spine.dataset.i));
            }}
            onPointerDown={(event) => {
              pointer.current = event.pointerType;
              was.current = cur;
              poke(event.target, true);
            }}
            onClick={(event) => {
              const target = event.target as Element;
              const spine = target.closest<HTMLElement>(".spine");
              const type = pointer.current;
              pointer.current = "";
              // the cat purrs when it's clicked or tapped (only for a real one)
              const cat = target.closest<HTMLElement>(".pr-cat");
              if (cat) {
                const ms = event.nativeEvent.isTrusted ? purr() : 0;
                if (ms) {
                  window.clearTimeout(Number(cat.dataset.purr));
                  cat.classList.add("purr");
                  cat.dataset.purr = String(window.setTimeout(() => cat.classList.remove("purr"), ms));
                }
                return;
              }
              // the turntable plays / pauses the song (only for a real click, tap or key), and never opens a sleeve
              if (target.closest(".vp-btn, .vp-plat")) {
                if (event.nativeEvent.isTrusted) music.toggle();
                return;
              }
              if (!spine) return;
              const i = Number(spine.dataset.i);
              if ((type === "touch" || type === "pen") && was.current !== i) {
                pull(i); // first tap pulls it out
                return;
              }
              pull(i);
              openItem(list[i].key);
            }}
            onFocus={(event) => {
              const spine = (event.target as Element).closest<HTMLElement>(".spine");
              if (spine && !pointer.current && Number(spine.dataset.i) !== cur) pull(Number(spine.dataset.i));
            }}
            onKeyDown={(event) => {
              if ((event.target as Element).closest(".vp-btn")) return; // the turntable's button keeps its own keys
              const step = ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: fit.per, ArrowUp: -fit.per, Home: -1e5, End: 1e5 } as Record<string, number>)[event.key];
              if (step === undefined) return;
              event.preventDefault();
              pointer.current = "";
              pull(cur + step, true);
            }}
          >
            {list.map((it, i) => (
              <Sleeve key={it.key} item={it} i={i} on={i === cur} hidden={i >= cap} code={codeOf(it)} />
            ))}
          </ul>
        </div>
        <div className="sh-row">
          <button
            className="pill alt sh-more"
            type="button"
            hidden={left <= 0}
            aria-label={`Show the other ${left} designs`}
            onClick={() => {
              const first = Number.isFinite(cap) ? cap : -1;
              setAll(true);
              pointer.current = "";
              if (first >= 0 && first < list.length) pull(first, true);
            }}
          >
            Pull out the rest <b>{left}</b>
          </button>
        </div>
        <p className="hint sh-hint">
          <span className="hh">point at a sleeve to pull it out · click to open · ← → ↑ ↓ move along the shelf</span>
          <span className="ht">tap a sleeve to pull it out · tap it again to open it</span>
        </p>
      </div>
      <article className="sh-pre" ref={preview}>
        <button className="sh-cover" type="button" aria-label="Open this design" onClick={() => item && openItem(item.key)}>
          {cover && item ? <img key={cover.src} src={cover.src} width={cover.w} height={cover.h} alt={item.title} decoding="async" /> : null}
        </button>
        <div className="sh-info">
          <p className="sh-no">
            <span>{item ? codeOf(item) : ""}</span>
            <b>{item ? `${pad2(cur + 1)} / ${pad2(list.length)} · ${year}` : ""}</b>
          </p>
          <h3 ref={titleRef}>{item?.title}</h3>
          <p className="sh-meta">{item ? `${formatDate(item.date)} · ${item.images.length}${item.images.length === 1 ? " image" : " images"}` : ""}</p>
          <button className="pill" type="button" onClick={() => item && openItem(item.key)}>
            Open
          </button>
        </div>
      </article>
    </div>
  );
}
