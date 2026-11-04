// The pencil doodles along the top of the record player, one set per song (lib/site/playlist.ts). Each is drawn
// in a 150 x 26 box that starts just right of the cat; the middle (x 50-118) stays empty for the pink tab.
// Lines take the doodle colour (currentColor); the swatches keep their own paint.

const heart = (x: number, y: number, s = 1, fill = false) =>
  `<path ${fill ? 'fill="currentColor"' : ""} d="M${x} ${y}c${-2 * s} ${-4 * s} ${-8 * s} ${-2 * s} ${-6 * s} ${3 * s}c${1 * s} ${3 * s} ${6 * s} ${7 * s} ${6 * s} ${7 * s}s${5 * s} ${-4 * s} ${6 * s} ${-7 * s}c${2 * s} ${-5 * s} ${-4 * s} ${-7 * s} ${-6 * s} ${-3 * s}z"/>`;
const sparkle = (x: number, y: number, r = 5) =>
  `<path d="M${x} ${y - r}q.6 ${r * 0.8} ${r} ${r}q${-r * 0.8} .6 ${-r} ${r}q-.6 ${-r * 0.8} ${-r} ${-r}q${r * 0.8} -.6 ${r} ${-r}z"/>`;
const dots = (list: [number, number][], r = 1.1) => list.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`).join("");
const cloud = (x: number, y: number) =>
  `<path d="M${x} ${y}h22c3 0 4-5 0-6 0-4-6-5-8-2-2-2-7-1-7 3-4 0-4 5-7 5z"/>`;
const note = (x: number, y: number) =>
  `<path d="M${x} ${y}V${y - 13}l9-3v13"/><circle cx="${x - 2.5}" cy="${y}" r="2.6" fill="currentColor" stroke="none"/><circle cx="${x + 6.5}" cy="${y - 3}" r="2.6" fill="currentColor" stroke="none"/>`;
const swatch = (x: number, y: number, fill: string, turn: number) =>
  `<rect x="${x}" y="${y}" width="9" height="12" rx="1.6" fill="${fill}" transform="rotate(${turn} ${x + 4.5} ${y + 6})"/>`;

export const DOODLES: Record<string, string> = {
  rose:
    `<path d="M20 12c0-3 4-3.6 4.6-.6s-2.3 4.8-5 3.8-3.6-5.6.4-7.3 8.4.4 8 5.2-4.6 7.5-9 6"/><path d="M21 19c-.6 2.4-1 4-.4 6M20.6 22.4c-4-1.5-6.3.4-7.3 1.6 3 1 5.4.2 7.3-1.6z"/>` +
    `<circle cx="38" cy="9" r="3.2"/><path d="M38 12.2c0 4-1 7 0 11"/>` +
    `<path d="M118 15c3-3 6-3 9 0s6 3 9 0 6-3 9 0M122 21c3-3 6-3 9 0s6 3 9 0"/>`,
  lights:
    `<path d="M0 5c12 10 30 10 48 1"/>` +
    [6, 15, 24, 33, 42].map((x, i) => `<ellipse cx="${x}" cy="${[8.5, 11.5, 12.5, 11, 8][i] + 3}" rx="2.1" ry="2.9" fill="currentColor" stroke="none"/>`).join("") +
    `<text x="114" y="17" font-family="ui-monospace,Consolas,monospace" font-size="7" font-weight="700" fill="currentColor" stroke="none" letter-spacing=".3">23 11 11</text>`,
  swatches:
    swatch(2, 8, "#ffbf00", -10) + swatch(13, 7, "#de5d83", -4) + swatch(24, 8, "#f5d547", 3) + swatch(35, 7, "#d4af37", 8) +
    swatch(112, 3, "#fffff0", -6) + swatch(122, 8, "#01796f", 2) + swatch(132, 7, "#6a3fa0", 6) + swatch(141, 8, "#0b0b0b", 11),
  smoke:
    `<path d="M10 25c-4-4 4-6 0-10s4-6 1-11"/><path d="M22 25c-3-3 3-5 0-8s3-5 1-9"/><path d="M34 25c-2-2 2-4 0-6s2-3 1-6"/>` +
    `<path d="M120 24c5-1 3-6 8-7s3-6 9-6 4-5 8-6"/>`,
  plane:
    `<path d="M2 20c8-14 22-14 18-5s-10 3-2-4 20-8 30-6" stroke-dasharray="2 3"/>` +
    `<path d="M120 14l26-9-9 17-5-6zM132 16l14-11"/>`,
  hearts: heart(14, 9, 1) + heart(34, 6, 0.6, true) + heart(130, 9, 0.8) + dots([[42, 18], [122, 20]]),
  sun:
    `<circle cx="16" cy="12" r="5"/><path d="M16 2v3M16 19v3M6 12h3M23 12h3M9 5l2 2M21 17l2 2M9 19l2-2M21 7l2-2"/>` + cloud(120, 20),
  butterflies:
    `<path d="M15 12c-3-6-10-6-9-1 1 4 6 4 9 1zm0 0c3-6 10-6 9-1-1 4-6 4-9 1zm0 0c-2 3-6 7-3 8 2 0 3-4 3-8zm0 0c2 3 6 7 3 8-2 0-3-4-3-8zM15 12l-2-6M15 12l2-6"/>` +
    `<path d="M38 8c-2-3-5-3-5 0 1 2 3 2 5 0zm0 0c2-3 5-3 5 0-1 2-3 2-5 0zm0 0c-1 2-3 4-1 4 1 0 1-2 1-4zm0 0c1 2 3 4 1 4-1 0-1-2-1-4z"/>` +
    sparkle(132, 10, 5) + dots([[143, 18], [122, 20], [146, 5]]),
  candle:
    `<rect x="11" y="12" width="8" height="12" rx="1"/><path d="M15 12V9"/><path fill="currentColor" d="M15 8.5c-3-3 0-6 0-8 2 3 3 5 0 8z"/><path d="M6 6l2 2M24 6l-2 2"/>` +
    `<path d="M137 4a7.5 7.5 0 1 0 7 11 6.5 6.5 0 0 1-7-11z"/>` + dots([[124, 8], [128, 18]]),
  tape:
    `<rect x="2" y="5" width="40" height="17" rx="2.5"/><circle cx="14" cy="13" r="3.2"/><circle cx="30" cy="13" r="3.2"/><path d="M17 13h10M8 22l3-4h22l3 4"/>` +
    `<path d="M118 18c6-8 10 4 16-4s8 2 14-2"/>`,
  sunspot:
    `<circle cx="15" cy="12" r="6"/><circle cx="17" cy="10" r="2" fill="currentColor" stroke="none"/><path d="M15 1v3M15 20v3M4 12h3M23 12h3M7 4l2 2M21 18l2 2M7 20l2-2M21 6l2-2"/>` +
    `<path d="M121 21l2-10 5 5 5-8 5 8 5-5 2 10z"/>`,
  streaks:
    `<path d="M2 22l20-14M12 24l20-14M24 24l18-12"/>` + dots([[24, 7], [35, 9], [44, 11]]) + sparkle(134, 13, 8),
  grid:
    `<path d="M0 24h48M4 20h40M10 16h28M24 12v12M15 12l-8 12M33 12l8 12"/>` + sparkle(130, 10, 6) + dots([[143, 6], [142, 19], [120, 20]]),
  waves:
    `<path d="M0 12c4-4 8-4 12 0s8 4 12 0 8-4 12 0 8 4 12 0M4 19c4-4 8-4 12 0s8 4 12 0 8-4 12 0"/>` +
    `<circle cx="134" cy="12" r="7"/><circle cx="137" cy="10" r="5.5" fill="currentColor" stroke="none" opacity=".35"/>`,
  notes: note(12, 21) + note(34, 17) + note(126, 20) + sparkle(144, 7, 4),
  rain:
    cloud(4, 12) + `<path d="M10 16l-2 5M17 16l-2 5M24 16l-2 5"/>` +
    `<path d="M124 4l-2 6M134 6l-2 6M144 4l-2 6M120 22c4-2 22-2 26 0"/>`,
  atom:
    `<ellipse cx="22" cy="13" rx="13" ry="4.5"/><ellipse cx="22" cy="13" rx="13" ry="4.5" transform="rotate(60 22 13)"/><ellipse cx="22" cy="13" rx="13" ry="4.5" transform="rotate(-60 22 13)"/><circle cx="22" cy="13" r="1.8" fill="currentColor" stroke="none"/>` +
    sparkle(132, 12, 6),
  phone:
    `<path d="M5 11c5-5 13-5 18 0l-3.5 3c-2.5-1.5-8.5-1.5-11 0zM9 14l-3 10h22l-3-10"/><circle cx="17" cy="19" r="2.3"/>` +
    `<path d="M29 7c2 1 3 3 3 5M33 4c3 2 4 5 4 8"/>` +
    `<path d="M120 9l4 3-4 3 4 3M130 7l4 4-4 4 4 4M140 9l4 3-4 3 4 3"/>`,
  sprout:
    `<path d="M4 24h40M22 24c0-6 0-9-1-12M21 14c-5-1-8-4-9-8 5 0 8 3 9 8zM22 12c4-3 8-3 11-1-3 3-7 3-11 1z"/>` +
    `<path d="M126 6c-2 3-2 5 0 6s3-3 0-6zM138 12c-2 3-2 5 0 6s3-3 0-6z"/>`,
  bubble:
    `<path d="M10 15c-5 0-6-6-2-7 0-4 6-6 9-3 3-3 9-1 9 3 4 1 3 7-1 7z"/><circle cx="31" cy="19" r="2"/><circle cx="37" cy="23" r="1.2"/>` +
    dots([[124, 14], [132, 14], [140, 14]], 1.5),
  skyline:
    `<path d="M0 24V14h6v-4h5v14M11 24V8h7v16M18 24v-8h6v-6h4v14M28 24h20"/>` + dots([[14, 12], [14, 17], [3, 18], [26, 15]], 0.9) +
    `<path d="M121 22a12 12 0 0 1 24 0M118 22h30M124 18h18"/>`,
  heartbeat: `<path d="M0 14h10l3-6 4 12 4-14 3 8h24"/>` + heart(134, 9, 0.9),
  clouds: cloud(2, 18) + cloud(24, 10) + sparkle(132, 9, 5) + dots([[142, 18], [122, 20]]),
  retro:
    `<path d="M4 18a14 14 0 0 1 28 0zM6 14h24M8 10.5h20M0 22h40"/>` + heart(132, 8, 0.7, true) + dots([[144, 18], [121, 17]]),
  palm:
    `<path d="M18 25c1-6 2-10 1-14M19 11c-4-4-10-4-13-1M19 11c4-4 10-4 13-1M19 11c-3-1-8 1-9 6M19 11c3-1 8 1 9 6M19 11c0-3-2-6-4-7"/>` +
    `<circle cx="136" cy="9" r="5"/><path d="M118 21c4-3 8-3 12 0s8 3 12 0"/>`
};

/** The doodle's markup for the player (empty for the first song, which keeps its own moon and stars). */
export function doodleSvg(id: string) {
  const inner = DOODLES[id];
  return inner
    ? `<svg viewBox="0 0 150 26" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
    : "";
}
