"use client";

import { useRef } from "react";
import { replay } from "@/lib/site/client";

// The lamp hanging over the featured crate at night (the hero lamp rules in styles/b2-night.css). Poke it and it swings,
// its pool of light with it. Round 3 of the mockup reworks its light: kept apart so it can be swapped whole.
export function HeroLamp() {
  const rig = useRef<HTMLDivElement>(null);
  const pool = useRef<HTMLSpanElement>(null);
  return (
    <>
      <div className="lamp-rig" ref={rig}>
        <span className="lamp-cord" aria-hidden="true" />
        <button
          className="lamp"
          type="button"
          aria-label="Swing the lamp"
          onClick={() => {
            replay(rig.current, "swing");
            replay(pool.current, "swing");
          }}
        >
          <svg viewBox="0 0 104 72" aria-hidden="true">
            <rect x="45" y="0" width="14" height="12" rx="3" fill="#2a2148" stroke="#0b0816" strokeWidth="2.5" />
            <path d="M38 12h28l30 44H8z" fill="#e8442b" stroke="#0b0816" strokeWidth="3" strokeLinejoin="round" />
            <path d="M42 17h20" stroke="#ff8f7a" strokeWidth="3" strokeLinecap="round" />
            <path d="M30 30 18 50" stroke="#ff8f7a" strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
            <ellipse cx="52" cy="57" rx="44" ry="8" fill="#ffd98a" stroke="#0b0816" strokeWidth="2.5" />
            <ellipse cx="52" cy="58" rx="26" ry="4.5" fill="#fffaf0" />
          </svg>
        </button>
      </div>
      <span className="lamp-pool" ref={pool} aria-hidden="true" />
    </>
  );
}
