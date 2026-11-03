"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cameFromSite, isPlainEscape } from "@/lib/site/client";
import { ArrowLeft, ArrowRight, BackArrow } from "./icons";

type Picture = { src: string; alt: string; from: HTMLElement };

// The fanzine pages (/blogs and each post): the post dialog's paper look as a page under the nav.
// "Back" (or Esc) goes back when you came from inside the site, else to `fallback`. Every [data-zoom] picture
// opens bigger in the viewer, in page order.
export function ZinePage({ backLabel, fallback, children }: { backLabel: string; fallback: string; children: ReactNode }) {
  const router = useRouter();
  const page = useRef<HTMLElement>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const [pictures, setPictures] = useState<Picture[]>([]);
  const [at, setAt] = useState<number | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const back = () => {
    if (cameFromSite()) router.back();
    else router.push(fallback);
  };
  const backRef = useRef(back);
  backRef.current = back;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isPlainEscape(event)) return;
      event.preventDefault();
      backRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const open = (from: HTMLElement) => {
    const buttons = [...(page.current?.querySelectorAll<HTMLElement>("[data-zoom]") ?? [])];
    const list = buttons.map((button) => {
      const img = button.querySelector("img");
      return { src: img?.currentSrc || img?.src || "", alt: img?.alt ?? "", from: button };
    });
    setPictures(list);
    setAt(Math.max(0, buttons.indexOf(from)));
  };
  const close = () => setAt(null);
  const count = pictures.length;
  const go = (i: number) => count && setAt(((i % count) + count) % count);

  useEffect(() => {
    const dialog = viewer.current;
    if (!dialog) return;
    if (at !== null && !dialog.open) {
      dialog.showModal();
      document.documentElement.classList.add("modal");
      dialog.querySelector<HTMLElement>(".lb-close")?.focus({ preventScroll: true });
    } else if (at === null && dialog.open) {
      dialog.close();
      document.documentElement.classList.remove("modal");
    }
  }, [at]);

  useEffect(() => () => document.documentElement.classList.remove("modal"), []);

  const picture = at !== null ? pictures[at] : null;
  const many = count > 1;

  return (
    <main
      className="zine zpage"
      id="main"
      ref={page}
      onClick={(event) => {
        const button = (event.target as Element).closest<HTMLElement>("[data-zoom]");
        if (button) open(button);
      }}
    >
      <div className="zn-bar">
        <button className="pill y" type="button" onClick={back}>
          <BackArrow />
          {backLabel}
        </button>
        <span className="zn-esc">Esc</span>
      </div>
      {children}
      <dialog
        className="lb"
        ref={viewer}
        aria-label="Image viewer"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => {
          if (at !== null) setAt(null);
          const from = picture?.from;
          if (from && document.contains(from)) from.focus({ preventScroll: true });
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            if (at !== null) go(at + 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            if (at !== null) go(at - 1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            close();
          }
        }}
      >
        <div className="lb-top">
          <span className="lb-count">{at !== null ? `${at + 1} / ${count}` : ""}</span>
          <button className="pill y lb-close" type="button" onClick={close}>
            Close
          </button>
        </div>
        <div
          className="lb-stage"
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse") return;
            swipe.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            const start = swipe.current;
            if (!start || at === null) return;
            swipe.current = null;
            const dx = event.clientX - start.x;
            const dy = event.clientY - start.y;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(at + (dx < 0 ? 1 : -1));
          }}
          onPointerCancel={() => (swipe.current = null)}
        >
          {picture ? <img key={picture.src} src={picture.src} alt={picture.alt} decoding="async" /> : null}
          <button className="lb-nav p" type="button" aria-label="Previous image" hidden={!many} onClick={() => at !== null && go(at - 1)}>
            <ArrowLeft />
          </button>
          <button className="lb-nav n" type="button" aria-label="Next image" hidden={!many} onClick={() => at !== null && go(at + 1)}>
            <ArrowRight />
          </button>
        </div>
        <p className="lb-cap">{picture?.alt}</p>
      </dialog>
    </main>
  );
}
