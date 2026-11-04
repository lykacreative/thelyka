"use client";
/* eslint-disable @next/next/no-img-element */

import { memo, useEffect, useRef } from "react";
import { reducedMotion, safeGet, safeSet } from "@/lib/site/client";
import { music, type MusicTrack } from "@/lib/site/music";
import { purr } from "@/lib/site/purr";
import { PLAYLIST, inkOn, songCover, songLine, type Song } from "@/lib/site/playlist";
import { doodleSvg } from "@/lib/site/doodles";

// The songs, in order (lib/site/playlist.ts); prev / next show up once there are two.
const TRACKS = PLAYLIST;
// what other controls see of each song (one object per song, so the shared store can tell a change)
const SHARED: MusicTrack[] = TRACKS.map((t) => ({ title: t.title, artist: t.artist, cover: songCover(t) }));
const LOOK_KEYS = ["paper", "ink", "acc", "btn", "cat"] as const;

const POS_KEY = "lyka-player";
const PLAY_D = "M6 3.5v13l11-6.5z";
const PAUSE_D = "M5.5 3.5h3v13h-3zM11.5 3.5h3v13h-3z";
const pad = (n: number) => String(n).padStart(2, "0");
const mmss = (s: number) => {
  s = Math.max(0, Math.floor(s || 0));
  return Math.floor(s / 60) + ":" + pad(s % 60);
};

// The record player: lives in the site layout, so the song keeps playing from page to page.
// Starts small and paused; never plays until someone presses play. Tap the record to play / pause (small:
// to open it), drag round the record or the needle or the line to skip, drag the pink tab (or the body with a
// mouse) to move it anywhere, drop it on the nav (or press the dock button) to put it back.
// Its audio and play state are shared through lib/site/music.ts, so other controls (the shelf's turntable) drive the same song.
export const Player = memo(function Player() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const found = ref.current;
    if (!found) return;
    const player: HTMLElement = found;
    const ac = new AbortController();
    const on = <T extends EventTarget>(target: T | null, type: string, fn: (e: never) => void, opts: AddEventListenerOptions = {}) =>
      target?.addEventListener(type, fn as EventListener, { ...opts, signal: ac.signal });
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
      return id;
    };
    const $ = <E extends Element = HTMLElement>(s: string) => player.querySelector<E>(s)!;

    const audio = $<HTMLAudioElement>(".pl-audio");
    const seek = $<HTMLInputElement>(".pl-seek");
    const seekRow = $(".pl-seekrow");
    const bubble = $(".pl-bubble");
    const disc = $<HTMLButtonElement>(".pl-disc");
    const rot = $(".pl-rot");
    const arm = $(".pl-arm");
    const deck = $(".pl-deck");
    const playBtn = $<HTMLButtonElement>(".pl-play");
    const icon = $<SVGPathElement>(".pl-ico path");
    const minBtn = $<HTMLButtonElement>(".pl-min");
    const grip = $<HTMLButtonElement>(".pl-grip");
    const elapsed = $(".pl-el");
    const total = $(".pl-tot");
    const doodle = $(".pl-dd");
    const navEl = player.closest(".nav") as HTMLElement | null;

    let track = 0;
    let scrub = false;
    let armDrag = false;
    let parked = false;
    let movedAt = 0;

    const durNow = () => (isFinite(audio.duration) && audio.duration > 0 ? audio.duration : TRACKS[track].dur);
    const clampT = (t: number) => Math.max(0, Math.min(durNow() - 0.25, t));
    const isMini = () => player.classList.contains("mini");
    // the tonearm: rests off the record, runs from the outer groove (start) to the label (end)
    const ARM_REST = -4;
    const ARM_A = 10;
    const ARM_B = 30;
    const setArm = (deg: number) => arm.style.setProperty("--arm", deg.toFixed(2) + "deg");
    const armAt = (t: number) => ARM_A + (ARM_B - ARM_A) * Math.min(1, Math.max(0, t / durNow()));

    function paint(t: number, live = false) {
      const d = durNow();
      const p = Math.min(100, Math.max(0, (t / d) * 100));
      seekRow.style.setProperty("--p", p.toFixed(3) + "%");
      if (!live || document.activeElement !== seek || !scrub) seek.value = String(t);
      seek.setAttribute("aria-valuetext", mmss(t) + " of " + mmss(d));
      elapsed.textContent = mmss(t);
      bubble.textContent = mmss(t) + " / " + mmss(d);
      if (scrub || live) {
        const th = 20;
        const w = seek.offsetWidth;
        if (w) bubble.style.left = (seek.offsetLeft + th / 2 + ((w - th) * p) / 100).toFixed(1) + "px";
      }
      if (!armDrag) setArm(!audio.paused || live || (t > 0.5 && !parked) ? armAt(t) : ARM_REST);
    }
    const startScrub = () => {
      scrub = true;
      player.classList.add("scrub");
    };
    const endScrub = () => {
      scrub = false;
      player.classList.remove("scrub");
    };
    // Covers are loaded and decoded before they're needed (the next song's once the page has loaded, the songs either
    // side of the one playing from the first time the player is pointed at or focused), one picture per song, kept. A song change then shows its cover in
    // the same frame as its look; before, the label still showed the last song's cover for a beat while the new one
    // (an original of up to 3000 px) loaded and decoded.
    type Cover = { img: HTMLImageElement; ready: Promise<unknown>; done: boolean };
    const covers = new Map<string, Cover>([[songCover(TRACKS[0]), { img: $<HTMLImageElement>(".pl-cover"), ready: Promise.resolve(), done: true }]]);
    function coverFor(t: Song) {
      const src = songCover(t);
      let cover = covers.get(src);
      if (!cover) {
        const img = new Image(640, 640);
        img.className = "pl-cover";
        img.alt = "";
        img.decoding = "async";
        img.draggable = false;
        img.fetchPriority = "high";
        img.src = src;
        const c: Cover = { img, ready: img.decode().catch(() => undefined), done: false };
        void c.ready.then(() => (c.done = true));
        covers.set(src, (cover = c));
      }
      return cover;
    }
    const warmAround = (i: number) => {
      coverFor(TRACKS[(i + 1) % TRACKS.length]);
      coverFor(TRACKS[(i - 1 + TRACKS.length) % TRACKS.length]);
    };
    on(player, "pointerenter", () => warmAround(track), { once: true });
    on(player, "focusin", () => warmAround(track), { once: true });
    const warmNext = () => later(() => coverFor(TRACKS[(track + 1) % TRACKS.length]), 1200);
    if (document.readyState === "complete") warmNext();
    else on(window, "load", warmNext, { once: true });
    const wait = (ms: number) => new Promise<void>((resolve) => later(resolve, ms));
    // a cover that takes longer than this (a slow connection) doesn't hold the song's look back: it shows when it's in
    const coverReady = (t: Song) => Promise.race([coverFor(t).ready, wait(900)]);

    // The song's look: its colours (Day and Night, read by the .skin rules in site-extra.css), its doodle, its
    // words and its label. The first song keeps the player's own look.
    function restyle(t: Song) {
      player.dataset.song = t.id;
      player.classList.toggle("skin", Boolean(t.day && t.night));
      if (t.day && t.night) {
        for (const [theme, look] of [["sd", t.day], ["sn", t.night]] as const) {
          for (const key of LOOK_KEYS) player.style.setProperty(`--${theme}-${key}`, look[key]);
          player.style.setProperty(`--${theme}-acc-ink`, inkOn(look.acc));
          player.style.setProperty(`--${theme}-btn-ink`, inkOn(look.btn));
          player.style.setProperty(`--${theme}-cat-ink`, inkOn(look.cat, "#2b2633", "#f4f1ea"));
        }
        player.style.setProperty("--sn-glow", t.night.glow);
      }
      doodle.innerHTML = doodleSvg(t.doodle);
      $(".pl-title").textContent = t.title;
      $(".pl-artist").textContent = songLine(t);
      $(".pl-hint").textContent = `tap the record · drag the needle or the line to skip · the ${t.tab} tab moves me`;
      const shown = $<HTMLImageElement>(".pl-cover");
      const { img: cover, ready, done } = coverFor(t);
      if (cover !== shown) shown.replaceWith(cover);
      // a cover still on its way (a slow connection, quick presses) fades in when it's ready instead of drawing in
      if (!done) {
        cover.classList.add("late");
        void ready.then(() => cover.classList.remove("late"));
      }
      // the first song keeps the stylesheet's crop of its cover; the others show their crop, or the whole cover
      cover.style.transform = t.day ? (t.crop ?? "none") : "";
    }
    // A new song turns the player over: it dips, takes the song's look and cover together, comes back. It waits at
    // the bottom of the dip only if the cover isn't ready yet. Pressing again mid-turn carries on from where it is.
    const LOW = { opacity: 0.15, scale: "0.94", rotate: "-2.5deg" };
    const UP = { opacity: 1, scale: "1", rotate: "0deg" };
    let swapId = 0;
    let dip: Animation | null = null;
    let rise: Animation | null = null;
    async function turnTo(t: Song) {
      const id = ++swapId;
      if (!dip) {
        const now = getComputedStyle(player);
        const from = { opacity: now.opacity, scale: now.scale, rotate: now.rotate };
        rise?.cancel();
        dip = player.animate([from, LOW], { duration: 190, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" });
      }
      await Promise.all([dip.finished.catch(() => undefined), coverReady(t)]);
      if (id !== swapId) return;
      restyle(t);
      rise = player.animate([LOW, UP], { duration: 280, easing: "cubic-bezier(0,0,.2,1)" });
      dip?.cancel();
      dip = null;
    }
    function loadTrack(i: number, swap = true) {
      track = (i + TRACKS.length) % TRACKS.length;
      const t = TRACKS[track];
      if (audio.getAttribute("src") !== t.src) audio.src = t.src;
      music.set({ track: SHARED[track] });
      seek.max = String(t.dur);
      total.textContent = mmss(t.dur);
      const many = TRACKS.length > 1;
      $<HTMLButtonElement>(".pl-prev").hidden = !many;
      $<HTMLButtonElement>(".pl-next").hidden = !many;
      paint(audio.currentTime || 0);
      if (!swap) {
        restyle(t);
        return;
      }
      warmAround(track);
      if (!reducedMotion() && !document.hidden) {
        void turnTo(t);
        return;
      }
      // reduced motion: straight to the new look, with its cover. A tab in the background (a song ending on its own
      // there) runs no animations and decodes no pictures, so it takes the look now and the cover fades in on return.
      const id = ++swapId;
      dip?.cancel();
      dip = null;
      if (document.hidden) restyle(t);
      else void coverReady(t).then(() => id === swapId && restyle(t));
    }
    function setPlayingUI(playing: boolean) {
      player.classList.toggle("playing", playing);
      music.set({ playing });
      icon.setAttribute("d", playing ? PAUSE_D : PLAY_D);
      icon.setAttribute("stroke-width", playing ? "0" : "1.4");
      playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
      if (!isMini()) disc.setAttribute("aria-label", playing ? "Pause the record" : "Play the record");
      paint(audio.currentTime || 0);
    }
    loadTrack(0, false);
    setPlayingUI(!audio.paused);

    // real seeking needs byte ranges; if the host can't give them, fall back to a blob of the same file
    const blobs: Record<number, Promise<string | null>> = {};
    const ensureBlob = (i: number) =>
      blobs[i] ||
      (blobs[i] = fetch(TRACKS[i].src)
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => (b ? URL.createObjectURL(b) : null))
        .catch(() => null));
    const canSeek = (t: number) => {
      for (let k = 0; k < audio.seekable.length; k++) if (t >= audio.seekable.start(k) && t <= audio.seekable.end(k)) return true;
      return false;
    };
    const waitMeta = () =>
      new Promise<void>((resolve) => {
        if (audio.readyState >= 1) return resolve();
        const done = () => resolve();
        audio.addEventListener("loadedmetadata", done, { once: true });
        audio.addEventListener("error", done, { once: true });
        later(done, 5000);
        if (audio.networkState === 0 || audio.networkState === 3) audio.load();
      });
    async function seekTo(t: number) {
      t = clampT(t);
      parked = false;
      paint(t);
      await waitMeta();
      if (canSeek(t)) {
        audio.currentTime = t;
        paint(t);
        return;
      }
      const was = !audio.paused;
      const i = track;
      const url = await ensureBlob(i);
      if (!url || i !== track) return;
      if (audio.src !== url) {
        audio.src = url;
        await new Promise<void>((resolve) => {
          audio.addEventListener("loadedmetadata", () => resolve(), { once: true });
          later(resolve, 5000);
        });
      }
      audio.currentTime = t;
      paint(t);
      if (was) audio.play().catch(() => {});
    }
    function togglePlay() {
      if (audio.paused) {
        parked = false;
        const p = audio.play();
        if (p && p.catch) p.catch(() => setPlayingUI(false));
      } else audio.pause();
    }
    on(playBtn, "click", togglePlay);
    const detach = music.attach({
      audio,
      toggle: togglePlay,
      play: () => {
        if (audio.paused) togglePlay();
      },
      pause: () => audio.pause()
    });
    on($(".pl-prev"), "click", () => {
      const was = !audio.paused;
      loadTrack(track - 1);
      if (was) audio.play().catch(() => {});
    });
    on($(".pl-next"), "click", () => {
      const was = !audio.paused;
      loadTrack(track + 1);
      if (was) audio.play().catch(() => {});
    });
    on(audio, "play", () => setPlayingUI(true));
    on(audio, "pause", () => setPlayingUI(false));
    on(audio, "ended", () => {
      setPlayingUI(false);
      if (TRACKS.length > 1) {
        loadTrack(track + 1);
        audio.play().catch(() => {});
      } else {
        audio.currentTime = 0;
        paint(0);
      }
    });
    on(audio, "loadedmetadata", () => {
      if (isFinite(audio.duration)) {
        seek.max = String(audio.duration);
        total.textContent = mmss(audio.duration);
      }
      if (!scrub) paint(audio.currentTime || 0);
    });
    on(audio, "timeupdate", () => {
      if (!scrub) paint(audio.currentTime);
    });

    // the progress line: click or drag; ← → = 5 s
    on(seek, "input", () => {
      if (!scrub) startScrub();
      paint(Number(seek.value), true);
    });
    on(seek, "change", () => {
      seekTo(Number(seek.value)).finally(endScrub);
    });
    on(seek, "pointerup", () =>
      later(() => {
        if (scrub && !armDrag) endScrub();
      }, 400)
    );
    on(seek, "blur", () => {
      if (scrub && !armDrag) endScrub();
    });
    let keyFlash = 0;
    const flashEnd = () => {
      window.clearTimeout(keyFlash);
      keyFlash = later(endScrub, 700);
    };
    on(seek, "keydown", (e: KeyboardEvent) => {
      const base = Number(seek.value) || 0;
      if (e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        startScrub();
        seekTo(base + (e.key === "ArrowRight" || e.key === "ArrowUp" ? 5 : -5));
        flashEnd();
      } else if (e.key === "PageUp" || e.key === "PageDown") {
        e.preventDefault();
        startScrub();
        seekTo(base + (e.key === "PageUp" ? 30 : -30));
        flashEnd();
      }
    });

    // the record: tap = play/pause (small player: tap = open it), drag round it = skip (one turn = 8 s)
    const SEC_TURN = 8;
    type DiscDrag = { cx: number; cy: number; a: number; total: number; t0: number; t: number; moved: boolean };
    let dd: DiscDrag | null = null;
    let discDragged = false;
    let scr = 0;
    on(disc, "pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      const r = disc.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      dd = { cx, cy, a: Math.atan2(e.clientY - cy, e.clientX - cx), total: 0, t0: Number(seek.value) || audio.currentTime || 0, t: 0, moved: false };
      try {
        disc.setPointerCapture(e.pointerId);
      } catch {}
    });
    on(disc, "pointermove", (e: PointerEvent) => {
      if (!dd) return;
      const a = Math.atan2(e.clientY - dd.cy, e.clientX - dd.cx);
      let d = a - dd.a;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      dd.a = a;
      const deg = (d * 180) / Math.PI;
      dd.total += deg;
      if (!dd.moved && Math.abs(dd.total) > 8) {
        dd.moved = true;
        player.classList.add("scratching");
        startScrub();
      }
      if (dd.moved) {
        scr += deg;
        rot.style.setProperty("--scr", scr.toFixed(1) + "deg");
        dd.t = clampT(dd.t0 + (dd.total / 360) * SEC_TURN);
        paint(dd.t, true);
      }
    });
    const discUp = () => {
      if (!dd) return;
      const w = dd;
      dd = null;
      if (!w.moved) return;
      discDragged = true;
      later(() => {
        discDragged = false;
      }, 400);
      player.classList.remove("scratching");
      seekTo(w.t).finally(endScrub);
    };
    on(disc, "pointerup", discUp);
    on(disc, "pointercancel", discUp);
    on(disc, "lostpointercapture", discUp);
    on(disc, "click", () => {
      if (discDragged) {
        discDragged = false;
        return;
      }
      if (Date.now() - movedAt < 350) return;
      if (isMini()) {
        setMini(false);
        minBtn.focus({ preventScroll: true });
      } else togglePlay();
    });
    on(disc, "keydown", (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        seekTo((Number(seek.value) || 0) + (e.key === "ArrowRight" ? 5 : -5));
      }
    });

    // the tonearm: drag the needle across the record to skip; lift it off to stop
    let armT = 0;
    const armDeg = (e: PointerEvent) => {
      const r = deck.getBoundingClientRect();
      const px = r.right - 11;
      const py = r.top + 11;
      return (Math.atan2(-(e.clientX - px), e.clientY - py) * 180) / Math.PI;
    };
    const armMove = (e: PointerEvent) => {
      if (!armDrag) return;
      const deg = Math.max(-6, Math.min(34, armDeg(e)));
      setArm(deg);
      if (deg >= ARM_A - 3) {
        armT = clampT(((deg - ARM_A) / (ARM_B - ARM_A)) * durNow());
        player.classList.add("scrub");
        paint(armT, true);
      } else {
        armT = -1;
        player.classList.remove("scrub");
      }
    };
    on(arm, "pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      armDrag = true;
      scrub = true;
      arm.classList.add("drag");
      try {
        arm.setPointerCapture(e.pointerId);
      } catch {}
      armMove(e);
    });
    on(arm, "pointermove", armMove);
    const armUp = () => {
      if (!armDrag) return;
      armDrag = false;
      arm.classList.remove("drag");
      if (armT < 0) {
        parked = true;
        audio.pause();
        endScrub();
        paint(audio.currentTime || 0);
      } else seekTo(armT).finally(endScrub);
    };
    on(arm, "pointerup", armUp);
    on(arm, "pointercancel", armUp);
    on(arm, "lostpointercapture", armUp);

    // the cat: purrs (only for a real click, tap or key) and sends up hearts
    let purring = 0;
    on($(".pl-cat"), "click", (e: MouseEvent) => {
      const c = e.currentTarget as HTMLElement;
      c.classList.remove("boop");
      void c.offsetWidth;
      c.classList.add("boop");
      const ms = e.isTrusted ? purr() : 0;
      if (ms) {
        window.clearTimeout(purring);
        timers.delete(purring);
        c.classList.add("purr");
        purring = later(() => c.classList.remove("purr"), ms);
      }
      if (reducedMotion()) return;
      for (let i = 0; i < 3; i++) {
        const h = document.createElement("span");
        h.className = "pl-heart";
        h.setAttribute("aria-hidden", "true");
        h.style.setProperty("--hx", c.offsetLeft + 8 + i * 11 + "px");
        h.style.setProperty("--hdx", (i - 1) * 16 + "px");
        h.style.animationDelay = i * 90 + "ms";
        h.innerHTML =
          '<svg viewBox="0 0 12 12"><path d="M6 10.6S1 7.5 1 4.2C1 2.5 2.3 1.4 3.7 1.4c1 0 1.8.6 2.3 1.4.5-.8 1.3-1.4 2.3-1.4 1.4 0 2.7 1.1 2.7 2.8 0 3.3-5 6.4-5 6.4z" fill="currentColor"/></svg>';
        player.appendChild(h);
        later(() => h.remove(), 1500);
      }
    });

    // big / small
    function setMini(small: boolean) {
      player.classList.toggle("mini", small);
      minBtn.textContent = small ? "+" : "–";
      minBtn.setAttribute("aria-label", small ? "Make the player big" : "Make the player small");
      minBtn.setAttribute("aria-expanded", String(!small));
      disc.setAttribute("aria-label", small ? "Show the music player" : audio.paused ? "Play the record" : "Pause the record");
      if (player.classList.contains("float")) {
        const r = player.getBoundingClientRect();
        placeAt(r.left, r.top, true);
        savePos();
      }
    }
    on(minBtn, "click", () => setMini(!isMini()));
    on(player, "click", (e: MouseEvent) => {
      if (!isMini() || Date.now() - movedAt < 350) return;
      if ((e.target as Element).closest("button,input,a")) return;
      setMini(false);
    });

    // move it anywhere: drag the body (mouse) or the pink tab (any pointer); it stays clear of the nav
    type Move = { id: number; sx: number; sy: number; ox: number; oy: number; on: boolean };
    let mv: Move | null = null;
    const topClear = () => Math.max(0, navEl ? navEl.getBoundingClientRect().bottom : 0) + 34;
    const botClear = () => window.innerHeight - 10;
    function clampXY(x: number, y: number): [number, number] {
      const w = player.offsetWidth;
      const h = player.offsetHeight;
      const minY = topClear();
      const maxY = botClear() - h;
      x = Math.min(Math.max(8, x), Math.max(8, window.innerWidth - w - 8));
      y = Math.min(Math.max(minY, y), Math.max(minY, maxY));
      return [x, y];
    }
    let snapTimer = 0;
    function placeAt(x: number, y: number, snap = false) {
      [x, y] = clampXY(x, y);
      player.classList.toggle("snap", snap);
      player.style.left = x + "px";
      player.style.top = y + "px";
      if (snap) {
        window.clearTimeout(snapTimer);
        snapTimer = later(() => player.classList.remove("snap"), 340);
      }
      return [x, y];
    }
    function savePos() {
      if (!player.classList.contains("float")) return;
      const r = player.getBoundingClientRect();
      const w = player.offsetWidth;
      const h = player.offsetHeight;
      const x = parseFloat(player.style.left);
      const y = parseFloat(player.style.top); // where it lands, not mid-snap
      const fx = (isNaN(x) ? r.left : x) / Math.max(1, window.innerWidth - w);
      const fy = (isNaN(y) ? r.top : y) / Math.max(1, window.innerHeight - h);
      safeSet(POS_KEY, JSON.stringify({ fx: +fx.toFixed(4), fy: +fy.toFixed(4) }));
    }
    function dock() {
      player.classList.remove("float", "snap", "moving");
      player.style.left = "";
      player.style.top = "";
      safeSet(POS_KEY, null);
    }
    function restorePos() {
      let s: { fx?: unknown; fy?: unknown } | null = null;
      try {
        s = JSON.parse(safeGet(POS_KEY) || "null");
      } catch {}
      if (!s || typeof s.fx !== "number" || typeof s.fy !== "number") return;
      player.classList.add("float");
      placeAt(s.fx * (window.innerWidth - player.offsetWidth), s.fy * (window.innerHeight - player.offsetHeight));
    }
    on(player, "pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element;
      const onGrip = !!target.closest(".pl-grip");
      if (!onGrip && (e.pointerType === "touch" || target.closest("button,input,a,.pl-arm"))) return;
      const r = player.getBoundingClientRect();
      mv = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, on: false };
      if (onGrip) e.preventDefault();
    });
    on(window, "pointermove", (e: PointerEvent) => {
      if (!mv || e.pointerId !== mv.id) return;
      if (!mv.on) {
        if (Math.hypot(e.clientX - mv.sx, e.clientY - mv.sy) < 5) return;
        mv.on = true;
        const r = player.getBoundingClientRect();
        player.classList.add("float", "moving");
        player.classList.remove("snap");
        player.style.left = r.left + "px";
        player.style.top = r.top + "px";
        mv.ox = Math.min(mv.ox, player.offsetWidth - 10);
        mv.oy = Math.min(mv.oy, player.offsetHeight - 10);
        try {
          player.setPointerCapture(mv.id);
        } catch {}
      }
      const x = Math.min(Math.max(0, e.clientX - mv.ox), window.innerWidth - player.offsetWidth);
      const y = Math.min(Math.max(0, e.clientY - mv.oy), window.innerHeight - player.offsetHeight);
      player.style.left = x + "px";
      player.style.top = y + "px";
    });
    const mvEnd = (e?: PointerEvent) => {
      if (!mv || (e && e.pointerId !== undefined && e.pointerId !== mv.id)) return;
      const m = mv;
      mv = null;
      if (!m.on) return;
      movedAt = Date.now();
      player.classList.remove("moving");
      const nb = navEl ? navEl.getBoundingClientRect() : null;
      if (nb && window.innerWidth >= 900 && e && e.clientY >= 0 && e.clientY < nb.bottom) {
        dock(); // dropped on the nav: back in its slot
        return;
      }
      placeAt(parseFloat(player.style.left) || 0, parseFloat(player.style.top) || 0, true);
      savePos();
    };
    on(window, "pointerup", mvEnd);
    on(window, "pointercancel", mvEnd);
    on(grip, "click", (e: MouseEvent) => {
      if (Date.now() - movedAt < 350) return;
      const g = e.currentTarget as HTMLElement;
      g.classList.remove("nudge");
      void g.offsetWidth;
      g.classList.add("nudge");
    });
    on(grip, "keydown", (e: KeyboardEvent) => {
      const k = ({ ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] } as Record<string, number[]>)[e.key];
      if (!k) return;
      e.preventDefault();
      const r = player.getBoundingClientRect();
      player.classList.add("float");
      placeAt(r.left + k[0], r.top + k[1], true);
      savePos();
    });
    on($(".pl-dock"), "click", () => {
      dock();
      grip.focus({ preventScroll: true });
    });
    const reclamp = () => {
      if (player.classList.contains("float") && !mv) {
        const r = player.getBoundingClientRect();
        placeAt(r.left, r.top);
      }
    };
    on(window, "resize", reclamp);
    if (window.visualViewport) on(window.visualViewport, "resize", reclamp);
    const observer = window.ResizeObserver ? new ResizeObserver(reclamp) : null;
    observer?.observe(document.documentElement);
    on(
      window,
      "scroll",
      () => {
        if (!player.classList.contains("float") || mv) return;
        const r = player.getBoundingClientRect();
        const [x, y] = clampXY(r.left, r.top);
        if (Math.abs(y - r.top) > 1 || Math.abs(x - r.left) > 1) placeAt(x, y, true);
      },
      { passive: true }
    );
    setMini(isMini());
    restorePos();

    return () => {
      ac.abort();
      detach();
      observer?.disconnect();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const t = TRACKS[0];
  return (
    <aside className="player mini" ref={ref} aria-label="Music player">
      <button className="pl-grip" type="button" aria-label="Move the player: drag this tab, or use the arrow keys">
        <span aria-hidden="true" />
      </button>
      <button className="pl-cat" type="button" aria-label="Pet the cat">
        <svg viewBox="0 0 46 40" aria-hidden="true">
          <path
            className="c-body"
            d="M5 14 4 2l11 7c5-2 11-2 16 0l11-7-1 12c3 4 3 10 0 14-4 7-12 9-18 9S9 35 5 28c-2-4-2-10 0-14z"
            fill="#c9b6f0"
            stroke="#4b4658"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path className="c-lines" d="M6 21h34M7 28h32" stroke="#4b4658" strokeWidth=".8" opacity=".45" />
          <circle className="c-cheek" cx="12" cy="25" r="4" fill="#f2a6c0" opacity=".8" />
          <circle className="c-cheek" cx="34" cy="25" r="4" fill="#f2a6c0" opacity=".8" />
          <path className="c-face" d="M16 19h3M27 19h3M21 27l2-3 2 3" stroke="#3a3446" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      <span className="pl-doodle pl-moon" aria-hidden="true" />
      <svg className="pl-doodle pl-stars" viewBox="0 0 40 20" aria-hidden="true">
        <path
          d="M6 3l1.4 3.6 3.6.4-2.8 2.4.9 3.6L6 11 2.9 13l.9-3.6L1 7l3.6-.4zM27 6l1 2.4 2.4.3-1.9 1.6.6 2.4L27 11.4l-2.1 1.3.6-2.4-1.9-1.6 2.4-.3zM36 1l.6 1.5 1.5.2-1.2 1 .4 1.5L36 4.4l-1.3.8.4-1.5-1.2-1 1.5-.2z"
          fill="none"
          stroke="#5d5670"
          strokeWidth=".9"
          strokeLinejoin="round"
        />
      </svg>
      <span className="pl-doodle pl-dd" aria-hidden="true" />
      <div className="pl-deck">
        <div className="pl-platter">
          <button className="pl-disc" type="button" aria-label="Show the music player">
            <span className="pl-vinyl">
              <span className="pl-rot">
                <span className="pl-lbl">
                  <img className="pl-cover" src={songCover(t)} width={640} height={640} alt="" decoding="async" draggable={false} />
                </span>
              </span>
            </span>
          </button>
        </div>
        <span className="pl-arm" aria-hidden="true">
          <i />
          <b />
        </span>
      </div>
      <div className="pl-info">
        <p className="pl-title">{t.title}</p>
        <p className="pl-artist">{songLine(t)}</p>
        <div className="pl-ctl">
          <button className="pl-btn sm pl-prev" type="button" aria-label="Previous song" hidden>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 4v12M15 4 7 10l8 6z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="pl-btn pl-play" type="button" aria-label="Play">
            <svg viewBox="0 0 20 20" aria-hidden="true" className="pl-ico">
              <path d={PLAY_D} fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="pl-btn sm pl-next" type="button" aria-label="Next song" hidden>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M15 4v12M5 4l8 6-8 6z" fill="currentColor" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="viz" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
      <div className="pl-seekrow">
        <input className="pl-seek" type="range" min={0} max={t.dur} step={0.1} defaultValue={0} aria-label="Seek" />
        <div className="pl-time">
          <span className="pl-el">0:00</span>
          <span className="pl-tot">{mmss(t.dur)}</span>
        </div>
        <span className="pl-bubble" aria-hidden="true">
          0:00
        </span>
      </div>
      <p className="pl-hint" aria-hidden="true">
        tap the record · drag the needle or the line to skip · the pink tab moves me
      </p>
      <button className="pl-dock" type="button" aria-label="Put the player back in its spot" title="Put it back">
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4 4l9 9M13 6.5V13H6.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <button className="pl-min" type="button" aria-label="Make the player big" aria-expanded="false">
        +
      </button>
      <audio className="pl-audio" preload="metadata" />
    </aside>
  );
});
