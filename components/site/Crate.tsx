"use client";
/* eslint-disable @next/next/no-img-element */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { coverOf, pad2, viewSrc, type SiteItem } from "@/lib/site-items";

export type CrateEntry =
  | { kind: "item"; item: SiteItem }
  | { kind: "divider"; year: string; count: number; color: string; tx: string };

export type CrateHandle = {
  go: (index: number) => boolean;
  next: () => void;
  prev: () => void;
  activate: () => void;
  readonly cur: number;
};

type CrateProps = {
  entries: CrateEntry[];
  label: string;
  title: string;
  maxK?: number;
  tabs?: boolean;
  needsArm?: boolean;
  start?: number;
  eager?: number;
  onChange?: (index: number, entry: CrateEntry) => void;
  onOpen?: (item: SiteItem) => void;
};

const TABX = ["6%", "30%", "54%", "16%", "42%", "64%"];
const TABC = ["#fffaf0", "#ffc933", "#f5b3c8", "#9fe0ae", "#cbbaf3", "#ffd9c7"];

// "D017: CUT-OUT" -> "D017"; "Poster Design 010: Hayao Miyazaki" -> "Hayao Miyazaki".
export function tabLabel(title: string) {
  const code = title.match(/^([^:]{1,6}):/);
  if (code) return code[1];
  const parts = title.split(":");
  return (parts[1] ?? parts[0]).trim();
}

// A record crate: the front sleeve shows its cover, the ones behind lean back with their tabs up.
// Drag, scroll (once armed), arrow keys or the tabs flick through it; the front opens.
export const Crate = forwardRef<CrateHandle, CrateProps>(function Crate(
  { entries, label, title, maxK = 5, tabs = true, needsArm = false, start = 0, eager = 0, onChange, onOpen },
  ref
) {
  const last = Math.max(0, entries.length - 1);
  const [cur, setCur] = useState(() => Math.min(start, last));
  const curRef = useRef(cur);
  curRef.current = cur;
  const root = useRef<HTMLDivElement>(null);
  const bin = useRef<HTMLDivElement>(null);
  const armed = useRef(!needsArm);
  const suppress = useRef(0);
  const drag = useRef<{ x: number; y: number; ax: number; ay: number; id: number; moved: boolean; touch: boolean } | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  const go = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(last, index));
      if (next === curRef.current) return false;
      curRef.current = next;
      setCur(next);
      return true;
    },
    [last]
  );

  const activate = useCallback(() => {
    const entry = entries[curRef.current];
    if (!entry) return;
    if (entry.kind === "divider") go(curRef.current + 1);
    else openRef.current?.(entry.item);
  }, [entries, go]);

  useImperativeHandle(
    ref,
    () => ({
      go,
      next: () => void go(curRef.current + 1),
      prev: () => void go(curRef.current - 1),
      activate,
      get cur() {
        return curRef.current;
      }
    }),
    [go, activate]
  );

  // Keep the index inside the list when the entries change.
  useEffect(() => {
    if (curRef.current > last) go(last);
  }, [last, go]);

  // Tell the owner, and keep keyboard focus on the front sleeve when it was on one.
  useEffect(() => {
    const entry = entries[cur];
    if (entry) changeRef.current?.(cur, entry);
    const active = document.activeElement;
    if (active && root.current?.contains(active) && active.closest(".sleeve") && !active.closest(".k-front")) {
      bin.current?.querySelector<HTMLElement>(".k-front .face")?.focus({ preventScroll: true });
    }
  }, [cur, entries]);

  // Scrolling flicks through the crate (only while it's armed: hovered, focused or touched).
  useEffect(() => {
    const element = bin.current;
    const rootElement = root.current;
    if (!element || !rootElement) return;
    let acc = 0;
    let lastWheel = 0;
    const onWheel = (event: WheelEvent) => {
      if (!armed.current) return;
      const value = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (!value) return;
      const dir = value > 0 ? 1 : -1;
      const can = dir > 0 ? curRef.current < last : curRef.current > 0;
      if (!can) return;
      event.preventDefault();
      acc += value * (event.deltaMode === 1 ? 40 : 1);
      const now = Date.now();
      if (Math.abs(acc) >= 40 && now - lastWheel > 90) {
        go(curRef.current + dir);
        acc = 0;
        lastWheel = now;
      }
    };
    const ac = new AbortController();
    element.addEventListener("wheel", onWheel, { passive: false, signal: ac.signal });
    if (needsArm) {
      rootElement.addEventListener("focusin", () => (armed.current = true), { signal: ac.signal });
      rootElement.addEventListener(
        "pointerleave",
        () => {
          armed.current = false;
          acc = 0;
        },
        { signal: ac.signal }
      );
      rootElement.addEventListener(
        "focusout",
        (event) => {
          if (!rootElement.contains(event.relatedTarget as Node | null)) armed.current = false;
        },
        { signal: ac.signal }
      );
    }
    return () => ac.abort();
  }, [go, last, needsArm]);

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    if (Date.now() - suppress.current < 350) {
      event.preventDefault();
      return;
    }
    const target = event.target as Element;
    const tab = target.closest<HTMLElement>(".tab");
    if (tab) {
      go(Number(tab.dataset.go));
      return;
    }
    const sleeve = target.closest<HTMLElement>(".sleeve");
    if (!sleeve) return;
    const index = Number(sleeve.dataset.i);
    if (index === curRef.current) activate();
    else go(index);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, ax: event.clientX, ay: event.clientY, id: event.pointerId, moved: false, touch: event.pointerType === "touch" };
    armed.current = true;
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = event.clientX - d.ax;
    const dy = event.clientY - d.ay;
    const horizontal = d.touch || Math.abs(dx) > Math.abs(dy);
    const step = 44;
    if (!d.moved && Math.hypot(event.clientX - d.x, event.clientY - d.y) > 8) {
      d.moved = true;
      bin.current?.classList.add("grabbing");
      try {
        bin.current?.setPointerCapture(d.id);
      } catch {}
    }
    if (horizontal ? Math.abs(dx) >= step : Math.abs(dy) >= step) {
      go(curRef.current + (horizontal ? (dx < 0 ? 1 : -1) : dy > 0 ? 1 : -1));
      d.ax = event.clientX;
      d.ay = event.clientY;
    }
  };
  const onPointerEnd = () => {
    const d = drag.current;
    if (!d) return;
    if (d.moved) suppress.current = Date.now();
    drag.current = null;
    bin.current?.classList.remove("grabbing");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    if (key === "ArrowRight" || key === "ArrowDown") {
      event.preventDefault();
      go(curRef.current + 1);
    } else if (key === "ArrowLeft" || key === "ArrowUp") {
      event.preventDefault();
      go(curRef.current - 1);
    } else if (key === "Home") {
      event.preventDefault();
      go(0);
    } else if (key === "End") {
      event.preventDefault();
      go(last);
    }
  };

  return (
    <div className="crate" ref={root} role="region" aria-roledescription="crate" aria-label={label} onKeyDown={onKeyDown}>
      <div
        className="bin"
        ref={bin}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onDragStart={(event) => event.preventDefault()}
      >
        {entries.map((entry, i) => {
          const k = i - cur;
          let place = "k-far";
          let z: number | undefined;
          if (k === 0) {
            place = "k-front";
            z = 120;
          } else if (k > 0 && k <= maxK) {
            place = "k-back";
            z = 100 - k;
          } else if (k === maxK + 1) {
            place = "k-back k-wait";
            z = 100 - k;
          } else if (k === -1) {
            place = "k-gone";
            z = 130;
          }
          const style: Record<string, string | number> = {};
          if (z !== undefined) style.zIndex = z;
          if (k > 0 && k <= maxK + 1) style["--k"] = k;
          const tabIndex = k > 0 && k <= maxK ? 0 : -1;
          if (entry.kind === "divider") {
            return (
              <div key={`y${entry.year}`} className={`sleeve divider ${place}`} data-i={i} style={{ ...style, ["--dc" as string]: entry.color }}>
                <button className="tab" type="button" data-go={i} tabIndex={tabIndex} style={{ ["--tc" as string]: entry.color, ["--tx" as string]: entry.tx }}>
                  {entry.year}
                </button>
                <button className="face" type="button" tabIndex={k === 0 ? 0 : -1} aria-label={`${entry.year}: ${entry.count} designs`}>
                  <span className="div-year">{entry.year}</span>
                  <span className="div-count">{entry.count} designs</span>
                  <span className="div-hint">flick on →</span>
                </button>
              </div>
            );
          }
          const item = entry.item;
          const cover = coverOf(item);
          return (
            <div key={item.key} className={`sleeve ${place}`} data-i={i} style={style}>
              {tabs ? (
                <button
                  className="tab"
                  type="button"
                  data-go={i}
                  tabIndex={tabIndex}
                  style={{ ["--tx" as string]: TABX[i % TABX.length], ["--tc" as string]: TABC[i % TABC.length] }}
                  aria-label={`Go to ${item.title}`}
                >
                  {tabLabel(item.title)}
                </button>
              ) : null}
              <span className="vinyl" aria-hidden="true">
                <i />
              </span>
              <button className="face" type="button" tabIndex={k === 0 ? 0 : -1} aria-label={item.title}>
                <img
                  src={viewSrc(cover)}
                  width={cover.w}
                  height={cover.h}
                  loading={i < eager ? "eager" : "lazy"}
                  fetchPriority={i < eager ? undefined : "low"}
                  decoding="async"
                  alt={item.title}
                  draggable={false}
                />
                <span className="face-open">Open</span>
              </button>
            </div>
          );
        })}
      </div>
      <div className="crate-panel" aria-hidden="true" />
      <span className="crate-label" aria-hidden="true">
        {title}
      </span>
      <span className="crate-count" aria-hidden="true">
        {entries.length ? `${pad2(cur + 1)}/${pad2(entries.length)}` : ""}
      </span>
    </div>
  );
});
