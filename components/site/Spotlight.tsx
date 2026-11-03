"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { reducedMotion, replay } from "@/lib/site/client";

// The Art section's light: a track lamp on the ceiling, one pool of light on the wall and one beam from the lamp
// to it. Both are eased toward their target each frame and moved by transform only; frame boxes are measured
// once (resize, new hang, pointer entering the wall), never inside pointer or scroll handlers.
// Round 3 of the mockup ("soft fading light beams + smooth following"): kept apart so it can change on its own.

export type SpotlightHandle = {
  pool: HTMLSpanElement | null;
  beam: HTMLSpanElement | null;
  track: HTMLButtonElement | null;
};

const GELS = ["255,205,140", "255,150,190", "196,176,255", "150,235,200"];

export const SpotlightRig = forwardRef<SpotlightHandle>(function SpotlightRig(_, ref) {
  const pool = useRef<HTMLSpanElement>(null);
  const beam = useRef<HTMLSpanElement>(null);
  const track = useRef<HTMLButtonElement>(null);
  const gel = useRef(0);
  useImperativeHandle(ref, () => ({
    get pool() {
      return pool.current;
    },
    get beam() {
      return beam.current;
    },
    get track() {
      return track.current;
    }
  }));
  return (
    <>
      <div className="art-light" aria-hidden="true">
        <span className="pool" ref={pool} />
        <span className="beam" ref={beam} />
      </div>
      <button
        className="track"
        ref={track}
        type="button"
        aria-label="Change the colour of the spotlight"
        onClick={(event) => {
          gel.current = (gel.current + 1) % GELS.length;
          (event.currentTarget.closest(".art") as HTMLElement | null)?.style.setProperty("--gel", GELS[gel.current]);
          replay(event.currentTarget, "clk");
        }}
      >
        <svg viewBox="0 0 44 60" aria-hidden="true">
          <rect x="15" y="-6" width="14" height="10" rx="2" fill="#2b2622" />
          <circle cx="22" cy="14" r="6.5" fill="#4a443b" stroke="#171512" strokeWidth="2" />
          <path d="M12 20h20l5 30H7z" fill="#2b2622" stroke="#171512" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M15.5 24h4l-1.5 20h-4.5z" fill="#fff" opacity=".2" />
          <ellipse className="lens" cx="22" cy="50.5" rx="15" ry="5" stroke="#171512" strokeWidth="2" />
        </svg>
      </button>
    </>
  );
});

type Center = { f: HTMLElement; s: HTMLElement | null; l: number; t: number; x: number; y: number; w: number; h: number; near: boolean };

export type Spotlight = {
  measure: () => void;
  setSpot: (x: number, y: number, follow: boolean) => void;
  lightFrame: (frame: HTMLElement) => void;
  aimAt: (clientX: number, clientY: number) => void;
  litKey: () => string | null;
  clearLit: () => void;
  setEase: (value: number) => void;
  destroy: () => void;
};

const CANY = 36;

export function createSpotlight(opts: {
  art: HTMLElement;
  wall: HTMLElement;
  rig: SpotlightHandle;
  frames: () => HTMLElement[];
}): Spotlight {
  const { art, wall, rig, frames } = opts;
  const pool = rig.pool!;
  const beam = rig.beam!;
  const track = rig.track!;
  let artX = 0;
  let artY = 0;
  let canx = 0;
  let srPx = 200;
  let lx: number | null = null;
  let ly: number | null = null;
  let tx = 0;
  let ty = 0;
  let ease = 0.12;
  let raf = 0;
  let last = 0;
  let inView = true;
  let px: number | null = null;
  let py: number | null = null;
  let cents: Center[] = [];
  let lit: string | null = null;

  const paint = () => {
    if (lx === null || ly === null) return;
    const x = lx;
    const y = ly;
    const dx = x - canx;
    const dy = y - CANY;
    const a = Math.atan2(-dx, dy);
    const len = Math.max(10, Math.hypot(dx, dy));
    pool.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    beam.style.transform = `translate3d(${canx.toFixed(1)}px,${CANY}px,0) rotate(${a.toFixed(4)}rad) scaleY(${((len * 1.2) / 1000).toFixed(4)})`;
    track.style.rotate = a.toFixed(4) + "rad";
    const R = srPx * 1.12 + 6;
    const R2 = R * R;
    for (const c of cents) {
      // only the frames the light can reach get repainted
      const ex = Math.max(c.l - x, 0, x - c.l - c.w);
      const ey = Math.max(c.t - y, 0, y - c.t - c.h);
      if (ex * ex + ey * ey < R2) {
        c.s?.style.setProperty("--gx", (x - c.l).toFixed(1) + "px");
        c.s?.style.setProperty("--gy", (y - c.t).toFixed(1) + "px");
        c.near = true;
      } else if (c.near) {
        c.s?.style.removeProperty("--gx");
        c.s?.style.removeProperty("--gy");
        c.near = false;
      }
    }
  };

  const measure = () => {
    const box = art.getBoundingClientRect();
    artX = box.left + window.scrollX;
    artY = box.top + window.scrollY;
    canx = box.width / 2;
    art.style.setProperty("--canx", canx.toFixed(1) + "px");
    srPx = Math.min(290, Math.max(150, window.innerWidth * 0.22));
    beam.style.setProperty("--ha", ((Math.atan((srPx * 0.75) / 1000) * 180) / Math.PI).toFixed(2) + "deg");
    cents.forEach((c) => {
      if (c.near) {
        c.s?.style.removeProperty("--gx");
        c.s?.style.removeProperty("--gy");
      }
    });
    cents = frames().map((f) => {
      const r = (f.querySelector(".gf-box") as HTMLElement).getBoundingClientRect();
      const x = r.left - box.left;
      const y = r.top - box.top;
      return { f, s: f.querySelector<HTMLElement>(".gf-shade"), l: x, t: y, x: x + r.width / 2, y: y + r.height / 2, w: r.width, h: r.height, near: false };
    });
    if (lx !== null) paint();
  };

  const tick = (t: number) => {
    raf = 0;
    if (!inView || lx === null || ly === null) {
      last = 0;
      return;
    }
    const dt = Math.min(64, last ? t - last : 16.7);
    last = t;
    const k = 1 - Math.pow(1 - ease, dt / 16.7);
    lx += (tx - lx) * k;
    ly += (ty - ly) * k;
    const done = Math.abs(tx - lx) < 0.25 && Math.abs(ty - ly) < 0.25;
    if (done) {
      lx = tx;
      ly = ty;
    }
    paint();
    if (done) last = 0;
    else raf = requestAnimationFrame(tick);
  };

  const markLit = (x: number, y: number) => {
    let best: Center | null = null;
    let bd = Infinity;
    cents.forEach((c) => {
      if (Math.abs(c.x - x) < c.w / 2 + 14 && Math.abs(c.y - y) < c.h / 2 + 14) {
        const d = Math.hypot(c.x - x, c.y - y);
        if (d < bd) {
          bd = d;
          best = c;
        }
      }
    });
    const key = best ? ((best as Center).f.dataset.gk ?? null) : null;
    if (key !== lit) {
      lit = key;
      wall.querySelectorAll<HTMLElement>(".gframe").forEach((f) => f.classList.toggle("lit", f.dataset.gk === key));
    }
  };

  const setSpot = (x: number, y: number, follow: boolean) => {
    tx = x;
    ty = y;
    ease = reducedMotion() ? 1 : follow ? 0.3 : 0.11;
    if (lx === null) {
      lx = x;
      ly = y;
    }
    markLit(x, y);
    if (!raf && inView) {
      last = 0;
      raf = requestAnimationFrame(tick);
    }
  };

  const lightFrame = (frame: HTMLElement) => {
    const c = cents.find((c) => c.f === frame);
    if (c) setSpot(c.x, c.y, false);
  };
  const aimAt = (cx: number, cy: number) => setSpot(cx - artX + window.scrollX, cy - artY + window.scrollY, true);

  const ac = new AbortController();
  const signal = ac.signal;
  art.addEventListener(
    "pointerenter",
    (event) => {
      if (event.pointerType !== "touch") measure();
    },
    { signal }
  );
  art.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      px = event.clientX;
      py = event.clientY;
      aimAt(px, py);
    },
    { passive: true, signal }
  );
  art.addEventListener("pointerleave", () => (px = null), { signal });
  window.addEventListener(
    "scroll",
    () => {
      if (px !== null && py !== null) aimAt(px, py); // the light stays under the pointer while the page scrolls
    },
    { passive: true, signal }
  );
  art.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "touch") {
        measure();
        aimAt(event.clientX, event.clientY);
        ease = 0.11;
      }
    },
    { passive: true, signal }
  );
  const io = window.IntersectionObserver
    ? new IntersectionObserver(
        (entries) => {
          inView = entries[entries.length - 1].isIntersecting;
          if (inView) {
            measure();
            if (!raf && lx !== null && (lx !== tx || ly !== ty)) raf = requestAnimationFrame(tick);
          }
        },
        { rootMargin: "120px 0px" }
      )
    : null;
  io?.observe(art);

  return {
    measure,
    setSpot,
    lightFrame,
    aimAt,
    litKey: () => lit,
    clearLit: () => {
      lit = null;
    },
    setEase: (value: number) => {
      ease = value;
    },
    destroy: () => {
      ac.abort();
      io?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    }
  };
}
