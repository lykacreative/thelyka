"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef } from "react";
import { reducedMotion, replay } from "@/lib/site/client";
import type { AboutImage } from "@/lib/site/data";

// The record in About: drag it round to spin it (it coasts), click for a spin.
function AboutRecord() {
  const rec = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = rec.current;
    if (!element) return;
    let ang = 0;
    let vel = 0;
    let last = 0;
    let drag = false;
    let moved = 0;
    let raf = 0;
    const center = () => {
      const r = element.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    };
    const angle = (event: PointerEvent) => {
      const [cx, cy] = center();
      return (Math.atan2(event.clientY - cy, event.clientX - cx) * 180) / Math.PI;
    };
    const apply = () => {
      element.style.transform = `rotate(${ang}deg)`;
    };
    const coast = () => {
      cancelAnimationFrame(raf);
      const step = () => {
        vel *= 0.965;
        ang += vel;
        apply();
        if (Math.abs(vel) > 0.15) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const ac = new AbortController();
    const opts = { signal: ac.signal };
    element.addEventListener("transitionend", () => (element.style.transition = ""), opts);
    element.addEventListener(
      "pointerdown",
      (event) => {
        element.style.transition = "";
        drag = true;
        moved = 0;
        last = angle(event);
        vel = 0;
        cancelAnimationFrame(raf);
        try {
          element.setPointerCapture(event.pointerId);
        } catch {}
      },
      opts
    );
    element.addEventListener(
      "pointermove",
      (event) => {
        if (!drag) return;
        const a = angle(event);
        let d = a - last;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        ang += d;
        vel = d;
        moved += Math.abs(d);
        last = a;
        apply();
      },
      opts
    );
    const up = () => {
      if (!drag) return;
      drag = false;
      if (moved > 4 && !reducedMotion()) coast();
    };
    element.addEventListener("pointerup", up, opts);
    element.addEventListener("pointercancel", up, opts);
    element.addEventListener(
      "click",
      () => {
        if (moved > 4) {
          moved = 0;
          return;
        }
        cancelAnimationFrame(raf);
        if (!reducedMotion()) element.style.transition = "transform 1.6s cubic-bezier(.15,.75,.25,1)";
        ang += reducedMotion() ? 90 : 720;
        apply();
      },
      opts
    );
    return () => {
      ac.abort();
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <button className="rec" ref={rec} type="button" aria-label="Spin the record">
      <span className="rec-lab">
        <i className="mark" aria-hidden="true" />
        <small>LYKA MIMICS</small>
      </span>
    </button>
  );
}

// His photo, hung and lit like the gallery frames (round 3 of the mockup), shown whole. With no photo
// the frame shows its placeholder.
function AboutPhoto({ photo }: { photo: AboutImage | null }) {
  const frame = useRef<HTMLElement>(null);
  const shape = !photo ? "none" : photo.width > photo.height * 1.05 ? "wide" : "tall";
  const classes = ["ab-frame", "f-black", shape !== "none" ? "has-photo" : "", shape === "wide" ? "wide" : ""].filter(Boolean).join(" ");
  return (
    <figure className={classes} ref={frame}>
      <button className="ab-hang" type="button" aria-label="Give the photo a nudge" onClick={() => replay(frame.current, "nudge")}>
        <span className="gf-wire" aria-hidden="true" />
        <span className="gf-box">
          <span className="gf-mat">
            {photo ? (
              <img src={photo.src} width={photo.width} height={photo.height} alt="Lyka Mimics" loading="lazy" decoding="async" draggable={false} />
            ) : null}
            <span className="ab-ph">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="13.3" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              your photo
            </span>
          </span>
        </span>
        <span className="gf-light" aria-hidden="true" />
      </button>
      <span className="ab-stk" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.6" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="9" cy="10" r="1.3" fill="currentColor" />
          <circle cx="15" cy="10" r="1.3" fill="currentColor" />
          <path d="M8 14c1.2 1.8 2.5 2.5 4 2.5s2.8-.7 4-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </figure>
  );
}

// About: the record and his photo on the left, the words on the right.
export function AboutSection({ photo }: { photo: AboutImage | null }) {
  return (
    <section className="sec about" id="about" aria-labelledby="about-h">
      <div className="about-in">
        <div className="about-stage">
          <AboutRecord />
          <AboutPhoto photo={photo} />
        </div>
        <div>
          <h2 className="script" id="about-h">
            About
          </h2>
          <p className="about-txt">
            I’m Lyka Mimics, a creator driven by curiosity, adaptability, and digital creativity. I enjoy exploring new ideas, experimenting with different styles, and
            turning inspiration into something unique. Whether it’s design, content, or creative projects, I’m always evolving, learning, and finding new ways to express
            myself through the things I create online.
          </p>
          <a className="pill b" href="https://t.me/lykamimics" target="_blank" rel="noopener">
            Telegram{" "}
            <svg className="ico" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5 11l6-6M6 5h5v5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
