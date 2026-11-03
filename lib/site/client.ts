// Small helpers shared by the site's client components.

// A seeded random sequence (mulberry32): the same tilts and positions on the server and in the browser.
export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Restart a CSS animation class (wiggles, swings).
export function replay(element: Element | null | undefined, className: string) {
  if (!element) return;
  element.classList.remove(className);
  void (element as HTMLElement).offsetWidth;
  element.classList.add(className);
}

export function safeGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private windows and blocked storage: the page still works, it just doesn't remember.
  }
}

// ----------------------------------------------------------------- item view routing (#/<category>/<slug>)

export const ROUTE_EVENT = "lyka:route";

let openedHere = false;
let returnFocus: Element | null = null;

// Open an item over the page. The address gets its key (#/design/d017-cut-out), so it can be shared and
// Back closes it. history.pushState keeps Next.js's own history state on the entry.
export function openItem(key: string) {
  returnFocus = document.activeElement;
  openedHere = true;
  window.history.pushState(null, "", `#/${key}`);
  window.dispatchEvent(new Event(ROUTE_EVENT));
}

export function closeItem() {
  if (openedHere) {
    openedHere = false;
    window.history.back();
  } else {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    window.dispatchEvent(new Event(ROUTE_EVENT));
  }
}

export function takeReturnFocus() {
  const element = returnFocus;
  returnFocus = null;
  openedHere = false;
  return element;
}

export function routeKey() {
  const hash = window.location.hash;
  if (!hash.startsWith("#/")) return null;
  try {
    return decodeURIComponent(hash.slice(2));
  } catch {
    return hash.slice(2);
  }
}

// ----------------------------------------------------------------- "Back" on the fanzine pages

let pagesSeen = 0;

// The nav counts page changes inside the site; Back can go back only when you came from one of its pages.
export function notePage() {
  pagesSeen++;
}

export function cameFromSite() {
  return pagesSeen > 1;
}

// Esc on a page (not in a dialog, not while typing).
export function isPlainEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) return false;
  if (document.querySelector("dialog[open]")) return false;
  const target = event.target as Element | null;
  return !target?.closest?.("input,textarea,select,[contenteditable]");
}
