"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { itemDate, viewSrc, type SiteItem } from "@/lib/site-items";
import { ROUTE_EVENT, closeItem, routeKey, takeReturnFocus } from "@/lib/site/client";
import { useSite } from "./SiteProvider";
import { ArrowLeft, ArrowRight, BackArrow } from "./icons";

const CAT: Record<SiteItem["category"], string> = { design: "Design", arts: "Art", reviews: "Reviews" };

// One piece, full size, over whatever page you're on. Its address is the page's own plus #/<category>/<slug>,
// so it can be shared, and Back (or Esc) puts you where you were. The picture is the original file; until it's in,
// its box (sized from the stored size) shows the 1080p copy the crate, shelf or wall already loaded, and "loading…"
// under it until that copy is in too.
export function ItemView() {
  const { byKey } = useSite();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const [item, setItem] = useState<SiteItem | null>(null);
  const [index, setIndex] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const shown = useRef<SiteItem | null>(null);

  const route = useCallback(() => {
    const key = routeKey();
    if (key?.startsWith("blog/")) {
      router.replace(`/blogs/${encodeURIComponent(key.slice(5))}`); // the mockup's post links
      return;
    }
    const next = key ? byKey.get(key) ?? null : null;
    if (next === shown.current) return;
    shown.current = next;
    setIndex(0);
    setItem(next);
  }, [byKey, router]);

  useEffect(() => {
    route();
    window.addEventListener(ROUTE_EVENT, route);
    window.addEventListener("popstate", route);
    window.addEventListener("hashchange", route);
    return () => {
      window.removeEventListener(ROUTE_EVENT, route);
      window.removeEventListener("popstate", route);
      window.removeEventListener("hashchange", route);
    };
  }, [route]);

  // Open / close the dialog with the item.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const html = document.documentElement;
    if (item) {
      if (!element.open) {
        element.showModal();
        html.classList.add("modal");
      }
      element.scrollTop = 0;
      if (info.current) info.current.scrollTop = 0;
      closeButton.current?.focus({ preventScroll: true });
      return;
    }
    if (element.open) {
      element.close();
      html.classList.remove("modal");
      document.querySelectorAll(".gframe.down").forEach((frame) => window.setTimeout(() => frame.classList.remove("down"), 140));
      const back = takeReturnFocus();
      if (back instanceof HTMLElement && document.contains(back)) back.focus({ preventScroll: true });
    }
  }, [item]);

  useEffect(() => () => document.documentElement.classList.remove("modal"), []);

  const count = item?.images.length ?? 0;
  const many = count > 1;
  const at = count ? ((index % count) + count) % count : 0;
  const image = item?.images[at];
  const go = (i: number) => {
    if (!count) return;
    setIndex(((i % count) + count) % count);
  };

  const loaded = Boolean(image) && loadedSrc === image?.src;

  // Swipe between images (touch and pen).
  const swipe = useRef<{ x: number; y: number } | null>(null);

  return (
    <dialog
      className="iv"
      ref={dialog}
      aria-labelledby="iv-title"
      onCancel={(event) => {
        event.preventDefault();
        closeItem();
      }}
      onKeyDown={(event) => {
        const target = event.target as Element;
        if (target.matches?.("input,textarea")) return;
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(at + 1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(at - 1);
        } else if (event.key === "Escape") {
          event.preventDefault();
          closeItem();
        }
      }}
    >
      <div className="iv-wrap">
        <div
          className="iv-stage"
          onPointerDown={(event) => {
            if (event.pointerType === "mouse") return;
            swipe.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = swipe.current;
            if (!start) return;
            swipe.current = null;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) && many) go(at + (dx < 0 ? 1 : -1));
          }}
          onPointerCancel={() => (swipe.current = null)}
        >
          <button className="pill y iv-close" type="button" ref={closeButton} onClick={() => closeItem()}>
            <BackArrow />
            Back
          </button>
          <p className="iv-load" style={{ opacity: loaded ? 0 : 1 }}>
            loading…
          </p>
          <figure className="iv-fig">
            {item && image ? (
              <img
                key={image.src}
                src={image.src}
                width={image.w}
                height={image.h}
                style={{
                  ["--r" as string]: image.w / image.h,
                  ["--w" as string]: `${image.w}px`,
                  // see-through until the copy is in, so "loading…" shows through
                  ...(loaded ? {} : { backgroundColor: "transparent", backgroundImage: `url("${viewSrc(image)}")` })
                }}
                alt={item.title + (many ? ` (${at + 1} of ${count})` : "")}
                decoding="async"
                onLoad={() => setLoadedSrc(image.src)}
              />
            ) : null}
          </figure>
          <button className="iv-nav p" type="button" aria-label="Previous image" hidden={!many} onClick={() => go(at - 1)}>
            <ArrowLeft />
          </button>
          <button className="iv-nav n" type="button" aria-label="Next image" hidden={!many} onClick={() => go(at + 1)}>
            <ArrowRight />
          </button>
          <span className="iv-count" aria-live="polite">
            {count ? `${at + 1} / ${count}` : ""}
          </span>
        </div>
        <div className="iv-info" ref={info}>
          <p className="iv-tags">
            {item ? <span>{CAT[item.category]}</span> : null}
            {item?.type ? <span>{item.type}</span> : null}
          </p>
          <h2 id="iv-title">{item?.title}</h2>
          <p className="iv-date">{item ? `${itemDate(item)} · ${count}${count === 1 ? " image" : " images"}` : ""}</p>
          <div className="iv-thumbs">
            {item && many
              ? item.images.map((thumb, i) => (
                  <button key={`${thumb.src}-${i}`} type="button" aria-label={`Image ${i + 1}`} aria-current={i === at ? "true" : "false"} onClick={() => go(i)}>
                    <img src={viewSrc(thumb, 200)} width={thumb.w} height={thumb.h} loading="lazy" decoding="async" alt="" />
                  </button>
                ))
              : null}
          </div>
          <p className="iv-note">{item?.note}</p>
          <p className="iv-keys">← → images · Esc back</p>
        </div>
      </div>
    </dialog>
  );
}
