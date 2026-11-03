"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { coverOf, formatDate, type SiteItem } from "@/lib/site-items";
import { artSlugByType, artTypes, type ArtType } from "@/lib/art-types";
import { openItem, reducedMotion, rng } from "@/lib/site/client";
import { useSite } from "./SiteProvider";
import { SpotlightRig, createSpotlight, type Spotlight, type SpotlightHandle } from "./Spotlight";

type Room = "All" | ArtType;
const ROOMS: Room[] = ["All", ...artTypes];
const FRAMES = ["f-wood", "f-white", "f-p f-red", "f-gold", "f-black", "f-p f-blue", "f-white", "f-wood", "f-p f-lav", "f-gold", "f-p f-green", "f-black", "f-white"];

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Hung = {
  item: SiteItem;
  ar: number;
  kind: "s" | "p" | "d";
  big: boolean;
  dy: number;
  k: number;
  jx: string;
  r: string;
  frame: string;
  info: string;
};

// Each room's hang: frame, tilt, size and drop for every piece (the same on every visit).
function hangRoom(list: SiteItem[], room: Room): Hung[] {
  const R = rng(21 + ROOMS.indexOf(room));
  const off = ROOMS.indexOf(room) * 4;
  let pi = 0;
  return list.map((item, i) => {
    const im = coverOf(item);
    const ar = im.w / im.h;
    const n = item.images.length;
    const kind = item.type === "Sketches" ? "s" : item.type === "Photography" ? "p" : "d";
    const big = kind === "p" && (ar >= 1.15 || pi++ % 3 === 0); // photos and wide pieces hang bigger
    const k = kind === "s" ? 0.7 + R() * 0.18 : 0.96 + R() * 0.04; // sketches hang smaller in their spot
    const jx = ["flex-start", "center", "flex-end"][Math.floor(R() * 3)];
    const dy = Math.round(R() * 30);
    const r = (R() * 5 - 2.5).toFixed(1);
    return { item, ar, kind, big, dy, k, jx, r, frame: FRAMES[(i + off) % FRAMES.length], info: formatDate(item.date) + (n > 1 ? ` · ${n} images` : "") };
  });
}

type WallControl = { setRoom: () => void; hangMore: () => void; destroy: () => void };

// Art: the lit gallery wall, hung salon style across the whole width. Rooms by type, about one and a quarter
// screens hung at first, "Hang more" for the rest. On /arts/<type> the rooms keep the address in step (syncPath).
export function ArtSection({ initialRoom = "All", syncPath = false, heading = "h2" }: { initialRoom?: Room; syncPath?: boolean; heading?: "h1" | "h2" }) {
  const { items } = useSite();
  const arts = useMemo(() => items.filter((item) => item.category === "arts"), [items]);
  const byType = useMemo(() => {
    const map = { All: arts } as Record<Room, SiteItem[]>;
    artTypes.forEach((type) => (map[type] = arts.filter((item) => item.type === type)));
    return map;
  }, [arts]);
  const [room, setRoom] = useState<Room>(initialRoom);
  const [left, setLeft] = useState(0);
  const hung = useMemo(() => hangRoom(byType[room], room), [byType, room]);
  const art = useRef<HTMLElement>(null);
  const wall = useRef<HTMLUListElement>(null);
  const rig = useRef<SpotlightHandle>(null);
  const control = useRef<WallControl | null>(null);

  useIsoLayoutEffect(() => {
    const section = art.current;
    const gw = wall.current;
    if (!section || !gw || !rig.current) return;
    let hungN = 0;
    let cols = 0;
    let wallW = 0;
    let lastPT = "";
    let prevLit: string | null = null;
    let reT = 0;
    const timers = new Set<number>();
    const lis = () => [...gw.querySelectorAll<HTMLLIElement>(".gw-li")];
    const frames = () => [...gw.querySelectorAll<HTMLElement>(".gw-li:not([hidden]) .gframe")];

    // salon hang: columns sized to the wall, bigger pieces span two, each piece goes where the wall is lowest
    const spanOf = (li: HTMLElement, C: number) => (C >= 4 && li.dataset.big === "1" && (Number(li.dataset.ar) >= 1.15 || C >= 5) ? 2 : 1);
    const layout = () => {
      const W = gw.clientWidth;
      if (!W) return;
      const phone = W < 700;
      const g = phone ? 14 : Math.round(Math.min(34, Math.max(20, W * 0.02)));
      const C = Math.max(1, Math.min(7, Math.floor((W + g) / ((phone ? 150 : 200) + g))));
      const cw = (W - g * (C - 1)) / C;
      const gy = phone ? 10 : Math.round(g * 0.7);
      const hs = new Array(C).fill(0);
      cols = C;
      wallW = W;
      gw.classList.toggle("one", C === 1);
      const shown = lis().filter((li) => !li.hidden);
      shown.forEach((li) => {
        const s = Math.min(spanOf(li, C), C);
        li.dataset.s = String(s);
        li.style.width = (cw * s + g * (s - 1)).toFixed(1) + "px";
      });
      const H = shown.map((li) => li.offsetHeight);
      shown.forEach((li, i) => {
        const s = Number(li.dataset.s);
        let best = 0;
        let by = Infinity;
        for (let c = 0; c + s <= C; c++) {
          const y = Math.max(...hs.slice(c, c + s));
          if (y < by - 0.5) {
            by = y;
            best = c;
          }
        }
        const y = by + (C > 1 ? Number(li.dataset.dy) * (phone ? 0.35 : 1) : 0);
        li.style.left = (best * (cw + g)).toFixed(1) + "px";
        li.style.top = y.toFixed(1) + "px";
        for (let c = best; c < best + s; c++) hs[c] = y + H[i] + gy;
      });
      gw.style.height = Math.max(0, Math.max(...hs) - gy).toFixed(0) + "px";
    };
    const setMore = () => setLeft(lis().length - hungN);
    // first hang: about one and a quarter screens of wall; "Hang more" puts up the rest. A wider wall tops itself up.
    const fill = () => {
      const all = lis();
      all.forEach((li) => (li.hidden = false));
      gw.style.transition = "none"; // the wall never shrinks or grows by itself on screen: only "Hang more" animates
      layout();
      const target = Math.max(640, window.innerHeight * 1.3);
      const min = Math.max(hungN, Math.min(all.length, Math.max(4, cols * 2)));
      let n = 0;
      for (const li of all) {
        if (n >= min && parseFloat(li.style.top) + li.offsetHeight > target) break;
        n++;
      }
      all.forEach((li, i) => {
        li.hidden = i >= n;
        if (i >= hungN) li.style.setProperty("--i", String(i - hungN));
      });
      hungN = n;
      layout();
      setMore();
      void gw.offsetHeight;
      gw.style.transition = "";
    };

    // the room's own pointer bookkeeping first, then the light (it reads which frame was lit before a tap)
    const ac = new AbortController();
    const signal = ac.signal;
    section.addEventListener(
      "pointerdown",
      (event) => {
        lastPT = event.pointerType;
        prevLit = spot.litKey();
      },
      { passive: true, signal }
    );
    const spot: Spotlight = createSpotlight({ art: section, wall: gw, rig: rig.current, frames });

    const takeDown = (frame: HTMLElement) => {
      const key = frame.dataset.gk;
      if (!key) return;
      spot.lightFrame(frame);
      if (reducedMotion()) {
        openItem(key);
        return;
      }
      frame.classList.add("down");
      frame.focus({ preventScroll: true });
      const id = window.setTimeout(() => {
        timers.delete(id);
        openItem(key);
      }, 360);
      timers.add(id);
    };
    gw.addEventListener(
      "click",
      (event) => {
        const frame = (event.target as Element).closest<HTMLElement>(".gframe");
        if (!frame) return;
        const type = lastPT;
        lastPT = "";
        if (type === "touch" && prevLit !== frame.dataset.gk) {
          spot.lightFrame(frame); // first tap lights it
          return;
        }
        takeDown(frame);
      },
      { signal }
    );
    gw.addEventListener(
      "focusin",
      (event) => {
        const frame = (event.target as Element).closest<HTMLElement>(".gframe");
        if (frame && !lastPT) spot.lightFrame(frame);
      },
      { signal }
    );
    gw.addEventListener("keydown", () => (lastPT = ""), { signal });

    const rehang = () => {
      if (gw.clientWidth && gw.clientWidth !== wallW) fill();
      spot.measure();
    };
    const observer = window.ResizeObserver ? new ResizeObserver(rehang) : null;
    observer?.observe(gw);
    window.addEventListener("resize", rehang, { signal });
    document.fonts?.ready
      .then(() => {
        if (signal.aborted) return;
        layout(); // labels may wrap differently once the fonts arrive
        spot.measure();
      })
      .catch(() => {});

    control.current = {
      setRoom: () => {
        hungN = 0;
        fill();
        spot.clearLit();
        gw.querySelectorAll(".gframe.lit").forEach((f) => f.classList.remove("lit"));
        spot.measure();
        const first = gw.querySelector<HTMLElement>(".gframe");
        if (first) spot.lightFrame(first);
        window.clearTimeout(reT);
        reT = window.setTimeout(() => {
          spot.measure();
          const key = spot.litKey();
          const frame = key ? frames().find((g) => g.dataset.gk === key) : null;
          if (frame) spot.lightFrame(frame);
        }, 950);
      },
      hangMore: () => {
        const all = lis();
        const first = all[hungN];
        all.forEach((li, i) => {
          if (i >= hungN) {
            li.hidden = false;
            li.style.setProperty("--i", String(i - hungN));
          }
        });
        hungN = all.length;
        layout();
        setMore();
        spot.measure();
        lastPT = "";
        first?.querySelector<HTMLElement>(".gframe")?.focus({ preventScroll: true });
      },
      destroy: () => {
        ac.abort();
        observer?.disconnect();
        spot.destroy();
        window.clearTimeout(reT);
        timers.forEach((id) => window.clearTimeout(id));
      }
    };
    control.current.setRoom();
    return () => {
      control.current?.destroy();
      control.current = null;
    };
  }, []);

  // A new room: hang it fresh (runs after React has put up its frames).
  const firstRoom = useRef(true);
  useIsoLayoutEffect(() => {
    if (firstRoom.current) {
      firstRoom.current = false;
      return;
    }
    control.current?.setRoom();
  }, [room]);

  const choose = (next: Room, focus = false) => {
    if (next !== room) setRoom(next);
    if (syncPath) window.history.replaceState(window.history.state, "", next === "All" ? "/arts" : `/arts/${artSlugByType[next]}`);
    if (focus) document.getElementById(`room-${ROOMS.indexOf(next)}`)?.focus();
  };

  const Heading = heading;
  const count = byType[room].length;

  return (
    <section className="sec art" id="art" aria-labelledby="art-h" ref={art}>
      <SpotlightRig ref={rig} />
      <div className="gal-head">
        <div>
          <Heading className="script art-h" id="art-h">
            Art
          </Heading>
          <p className="art-sub">Sketches · Photography · Digital Art</p>
          <p className="gal-total">{arts.length} pieces on the wall</p>
        </div>
        <div
          className="rooms"
          role="tablist"
          aria-label="Rooms"
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            event.preventDefault();
            const i = (ROOMS.indexOf(room) + (event.key === "ArrowRight" ? 1 : -1) + ROOMS.length) % ROOMS.length;
            choose(ROOMS[i], true);
          }}
        >
          {ROOMS.map((r, i) => (
            <button
              key={r}
              className="room"
              role="tab"
              type="button"
              id={`room-${i}`}
              aria-selected={r === room}
              aria-controls="gwall"
              tabIndex={r === room ? 0 : -1}
              onClick={() => choose(r)}
            >
              <span>{r}</span>
              <b>{byType[r].length}</b>
            </button>
          ))}
        </div>
      </div>
      <ul className="gwall" id="gwall" role="tabpanel" aria-labelledby={`room-${ROOMS.indexOf(room)}`} ref={wall}>
        {hung.map((h) => {
          const im = coverOf(h.item);
          return (
            <li
              key={h.item.key}
              className="gw-li"
              data-ar={h.ar.toFixed(3)}
              data-kind={h.kind}
              data-big={h.big ? 1 : 0}
              data-dy={h.dy}
              style={{ ["--k" as string]: h.k.toFixed(3), ["--jx" as string]: h.jx }}
            >
              <button className={`gframe ${h.frame}`} type="button" data-gk={h.item.key} style={{ ["--r" as string]: `${h.r}deg` }} aria-label={`${h.item.title}, ${h.info}`}>
                <span className="gf-wire" aria-hidden="true" />
                <span className="gf-box">
                  <span className="gf-mat">
                    <img src={im.src} width={im.w} height={im.h} loading="lazy" decoding="async" alt="" draggable={false} />
                  </span>
                  <span className="gf-shade" aria-hidden="true" />
                </span>
                <span className="gf-light" aria-hidden="true" />
                <span className="gf-lab" aria-hidden="true">
                  <b>{h.item.title}</b>
                  <i>{h.info}</i>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="hang-row">
        <button
          className="hang-more"
          type="button"
          hidden={left <= 0}
          aria-label={left > 0 ? `Hang ${left} more ${left === 1 ? "piece" : "pieces"}` : undefined}
          onClick={() => control.current?.hangMore()}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 2.5v4M10 6.5c-2.6 0-4.4 1.6-4.4 3.6 0 1.4 1 2.4 2.2 2.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <rect x="3" y="12" width="14" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          Hang more <b>{left}</b>
        </button>
      </div>
      <p className="art-foot">
        <span>
          <span className="hh">move around to aim the spotlight · click a frame to take it down · click the lamp for a new colour</span>
          <span className="ht">tap to light a frame · tap it again to take it down · tap the lamp for a new colour</span>
        </span>
        <span>{`${room} · ${count}${count === 1 ? " piece" : " pieces"}`}</span>
      </p>
    </section>
  );
}
