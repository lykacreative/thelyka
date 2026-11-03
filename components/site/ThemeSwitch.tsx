"use client";

import { useEffect, useRef, useState } from "react";
import { THEME_KEY } from "@/lib/site/theme-script";
import { reducedMotion, safeGet, safeSet } from "@/lib/site/client";

type Theme = "day" | "night";

const root = () => document.documentElement;
const current = (): Theme => (root().dataset.theme === "night" ? "night" : "day");

function syncMeta(theme: Theme) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) meta.content = theme === "night" ? "dark" : "light";
}

// two frames from now: the new look has been drawn once by then
const afterPaint = (fn: () => void) => requestAnimationFrame(() => requestAnimationFrame(fn));

let flickTimer = 0;
// Night: the neon logotype flickers on (again, if it still is: off for a frame first, without forcing a layout).
function flickNeon() {
  if (reducedMotion()) return;
  const html = root();
  window.clearTimeout(flickTimer);
  const on = () => {
    html.classList.add("neon-flick");
    flickTimer = window.setTimeout(() => html.classList.remove("neon-flick"), 1900);
  };
  if (!html.classList.contains("neon-flick")) return on();
  html.classList.remove("neon-flick");
  afterPaint(on);
}

// Every colour changes at once: with "theme-swap" on, no part fades its own colours (80-odd of those at once made
// the switch slow on phones); it comes off once the new look is drawn, so hovers fade again.
function applyTheme(theme: Theme) {
  const html = root();
  html.classList.add("theme-swap");
  html.dataset.theme = theme;
  syncMeta(theme);
  if (theme === "night") flickNeon();
  afterPaint(() => html.classList.remove("theme-swap"));
}

type ViewTransition = { ready: Promise<void>; skipTransition: () => void };

// The new theme spreads out as a circle from the switch.
function setTheme(theme: Theme, button: HTMLElement | null) {
  safeSet(THEME_KEY, theme);
  const start = (document as Document & { startViewTransition?: (update: () => void) => ViewTransition }).startViewTransition;
  if (!start || reducedMotion() || !button || document.visibilityState !== "visible") {
    applyTheme(theme);
    return;
  }
  const box = button.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  try {
    const transition = start.call(document, () => {
      if (current() !== theme) applyTheme(theme);
    });
    window.setTimeout(() => {
      if (current() !== theme) applyTheme(theme);
    }, 450); // never wait on a stalled frame
    window.setTimeout(() => {
      try {
        transition.skipTransition();
      } catch {}
    }, 1000); // and never leave the page blocked by a stuck reveal
    transition.ready
      .then(() =>
        root().animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 420, easing: "cubic-bezier(.2,.7,.3,1)", pseudoElement: "::view-transition-new(root)" }
        )
      )
      .catch(() => {});
  } catch {
    applyTheme(theme);
  }
}

// The Day / Night switch. Its look follows <html data-theme> through CSS, so it is right from the first paint;
// the labels for screen readers catch up after load.
export function ThemeSwitch({ className = "theme-btn nav-theme" }: { className?: string }) {
  const [night, setNight] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setNight(current() === "night");
    const observer = new MutationObserver(() => setNight(current() === "night"));
    observer.observe(root(), { attributes: true, attributeFilter: ["data-theme"] });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = (event: MediaQueryListEvent) => {
      const saved = safeGet(THEME_KEY);
      if (saved !== "night" && saved !== "day" && saved !== "dark" && saved !== "light") applyTheme(event.matches ? "night" : "day");
    };
    media.addEventListener("change", onSystem);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onSystem);
    };
  }, []);

  // The neon comes on once when a page opens at night.
  useEffect(() => {
    if (current() === "night") flickNeon();
  }, []);

  const label = night ? "Switch to day" : "Switch to night";
  return (
    <button
      ref={button}
      className={className}
      type="button"
      aria-pressed={night}
      aria-label={label}
      title={label}
      onClick={() => setTheme(current() === "night" ? "day" : "night", button.current)}
    >
      <span className="tb-sw" aria-hidden="true">
        <i className="tb-knob" />
      </span>
      <span className="tb-txt" aria-hidden="true">
        <span className="tb-to-night">Night</span>
        <span className="tb-to-day">Day</span>
      </span>
    </button>
  );
}
