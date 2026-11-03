import { useSyncExternalStore } from "react";

// The site's one song player, shared. The record player in the nav (components/site/Player.tsx) owns the
// <audio> and registers its controls here; any other control on any page (the turntable on the Design shelf)
// reads the same state and drives the same audio, so the two always agree: press play on one and the other spins.

export type MusicTrack = { title: string; artist: string; cover: string };
export type MusicState = { ready: boolean; playing: boolean; track: MusicTrack | null };
export type MusicControls = { audio: HTMLAudioElement; toggle: () => void; play: () => void; pause: () => void };

const OFF: MusicState = { ready: false, playing: false, track: null };

let state: MusicState = OFF;
let controls: MusicControls | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<MusicState>) {
  const next = { ...state, ...patch };
  if (next.ready === state.ready && next.playing === state.playing && next.track === state.track) return;
  state = next;
  listeners.forEach((fn) => fn());
}

// Sound only ever starts from a real click, tap or key press: a browser without the user-activation API is trusted
// to block it itself.
function userStarted() {
  const ua = typeof navigator !== "undefined" ? (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation : undefined;
  return !ua || ua.isActive;
}

export const music = {
  get: () => state,
  serverState: () => OFF,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  /** The player's side: report what's playing. */
  set,
  /** The player's side: hand over the controls; the returned function takes them back. The play state follows the
   *  audio element's own events, so it stays right whichever control (or the song ending) changed it. */
  attach(next: MusicControls) {
    controls = next;
    const audio = next.audio;
    const follow = () => set({ playing: !audio.paused });
    const events = ["play", "pause", "ended", "emptied"];
    events.forEach((type) => audio.addEventListener(type, follow));
    set({ ready: true, playing: !audio.paused });
    return () => {
      events.forEach((type) => audio.removeEventListener(type, follow));
      if (controls !== next) return;
      controls = null;
      set({ ready: false, playing: false });
    };
  },
  /** The audio element itself (null until the player is on the page). */
  audio: () => controls?.audio ?? null,
  /** Any control: play / pause the one song. Starting needs a real click or tap. */
  toggle() {
    if (!controls) return;
    if (controls.audio.paused && !userStarted()) return;
    controls.toggle();
  },
  play() {
    if (controls && controls.audio.paused && userStarted()) controls.play();
  },
  pause() {
    controls?.pause();
  }
};

/** The shared song state for a React control: { ready, playing, track } plus toggle / play / pause. */
export function useMusic() {
  const now = useSyncExternalStore(music.subscribe, music.get, music.serverState);
  return { ...now, toggle: music.toggle, play: music.play, pause: music.pause };
}
