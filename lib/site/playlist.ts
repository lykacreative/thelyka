// The record player's playlist, in play order. Every song brings its own look for the player: its paper, ink,
// accent, play button and cat colours by Day and by Night, a doodle along the top (lib/site/doodles.ts), which tab
// colour the hint names, and the part of its cover the record's label shows. The first song is the player's
// original look (the cats-in-the-cold paper in b2-night.css), so it has no colours of its own.
// The site serves byte-for-byte copies of the original song files from public/media/songs; the originals are kept
// together in one folder off the site.

export type SongLook = { paper: string; ink: string; acc: string; btn: string; cat: string };
export type Song = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: number;
  src: string;
  /** the cover (the original file: from the song file itself, or Apple's catalogue); null = a label drawn in the song's colours */
  cover: string | null;
  /** seconds, until the file says */
  dur: number;
  /** where the record's label sits on the cover (a CSS transform of the cover inside the label) */
  crop?: string;
  /** the tab's colour, for the hint ("the violet tab moves me") */
  tab: string;
  doodle: string;
  day?: SongLook;
  night?: SongLook & { glow: string };
};

const S = "/media/songs/";

export const PLAYLIST: Song[] = [
  {
    id: "cats",
    title: "cats in the cold",
    artist: "mage tears",
    album: "cats in the cold",
    year: 2022,
    src: "/media/cats-in-the-cold.flac",
    cover: "/media/cats-in-the-cold-cover.jpg",
    dur: 166,
    tab: "pink",
    doodle: "moonstars"
  },
  {
    id: "dark-beach",
    title: "Dark Beach",
    artist: "Pastel Ghost",
    album: "Abyss",
    year: 2015,
    src: S + "dark-beach.flac",
    cover: S + "dark-beach.jpg",
    dur: 222,
    crop: "translate(-50%,-26%) scale(2.2)",
    tab: "violet",
    doodle: "rose",
    day: { paper: "#efe4fb", ink: "#251a48", acc: "#a24fd0", btn: "#d5bff5", cat: "#b996ea" },
    night: { paper: "#160f31", ink: "#efe6ff", acc: "#c06cf0", btn: "#b88cf0", cat: "#a77be0", glow: "rgba(170,90,230,.35)" }
  },
  {
    id: "oh-you",
    title: "oh, you",
    artist: "tommy oeffling",
    album: "tomboy / laundry / oh, you",
    year: 2023,
    src: S + "oh-you.flac",
    cover: S + "oh-you.jpg",
    dur: 134,
    crop: "translate(-45%,9%) scale(1.8)",
    tab: "yellow",
    doodle: "lights",
    day: { paper: "#f6e8da", ink: "#3b1418", acc: "#f0ac2e", btn: "#e3a48a", cat: "#e6b48f" },
    night: { paper: "#2a1216", ink: "#fbe9dc", acc: "#ffc24d", btn: "#f0b08f", cat: "#e0a57a", glow: "rgba(255,196,110,.3)" }
  },
  {
    id: "ivory",
    title: "IVORY",
    artist: "Unusual Demont",
    album: "HUES.",
    year: 2021,
    src: S + "ivory.mp3",
    cover: S + "ivory.jpg",
    dur: 157,
    crop: "translate(-34%,25%) scale(1.7)",
    tab: "gold",
    doodle: "swatches",
    day: { paper: "#fbf7ec", ink: "#2e2a22", acc: "#d3ab4f", btn: "#efe3c4", cat: "#f3ead2" },
    night: { paper: "#22201b", ink: "#f7f0de", acc: "#e6c06a", btn: "#efe3c4", cat: "#efe6cf", glow: "rgba(232,220,192,.22)" }
  },
  {
    id: "true-blue",
    title: "True Blue",
    artist: "Dirty Beaches",
    album: "Badlands",
    year: 2011,
    src: S + "true-blue.flac",
    cover: S + "true-blue.jpg",
    dur: 171,
    crop: "translate(-19%,8%) scale(1.6)",
    tab: "blue",
    doodle: "smoke",
    day: { paper: "#f2f2f0", ink: "#111111", acc: "#2147d6", btn: "#dcdcd8", cat: "#1c1c1c" },
    night: { paper: "#0d0d0f", ink: "#f1f1ef", acc: "#5b7cff", btn: "#e8e8e6", cat: "#ecece9", glow: "rgba(91,124,255,.3)" }
  },
  {
    id: "kanashimiwa-yoruno-muko",
    title: "Kanashimiwa Yoruno Muko",
    artist: "Takako Mamiya",
    album: "LOVE TRIP",
    year: 2023,
    src: S + "kanashimiwa-yoruno-muko.flac",
    cover: S + "kanashimiwa-yoruno-muko.jpg",
    dur: 245,
    crop: "translate(-56%,-10%) scale(2)",
    tab: "teal",
    doodle: "plane",
    day: { paper: "#e6f1ef", ink: "#1e3533", acc: "#33a89f", btn: "#b9dcd7", cat: "#cfe6e2" },
    night: { paper: "#0f2422", ink: "#e4f6f3", acc: "#5fe0d4", btn: "#a7e3dc", cat: "#bfe5df", glow: "rgba(95,224,212,.3)" }
  },
  {
    id: "make-luv",
    title: "Make Luv",
    artist: "Brent Faiyaz",
    album: "Make Luv",
    year: 2018,
    src: S + "make-luv.flac",
    cover: S + "make-luv.jpg",
    dur: 193,
    crop: "translate(-9%,9%) scale(1.8)",
    tab: "red",
    doodle: "hearts",
    day: { paper: "#f7e6cc", ink: "#2b1710", acc: "#d23b2f", btn: "#e9bf86", cat: "#e2b27a" },
    night: { paper: "#22130d", ink: "#f8e6cd", acc: "#ff5a4a", btn: "#e9bf86", cat: "#d9a56c", glow: "rgba(255,120,80,.28)" }
  },
  {
    id: "day-dreamin",
    title: "Day Dreamin",
    artist: "Vacations",
    album: "Days",
    year: 2015,
    src: S + "day-dreamin.flac",
    cover: S + "day-dreamin.jpg",
    dur: 115,
    crop: "translate(-31%,18%) scale(2.2)",
    tab: "pink",
    doodle: "sun",
    day: { paper: "#f4f1ee", ink: "#3a3f2e", acc: "#ef7fa8", btn: "#d9dcc8", cat: "#e6d2bd" },
    night: { paper: "#1d1f17", ink: "#f2efe8", acc: "#ff8fbb", btn: "#d9dcc8", cat: "#e2cdb5", glow: "rgba(255,143,187,.28)" }
  },
  {
    id: "midnight",
    title: "midnight",
    artist: "Dead Butterflies",
    album: "heat death of the universe",
    year: 2025,
    src: S + "midnight.mp3",
    cover: S + "midnight.jpg",
    dur: 127,
    crop: "translate(0%,7%) scale(1.5)",
    tab: "yellow",
    doodle: "butterflies",
    day: { paper: "#e3e6f4", ink: "#161a33", acc: "#e8b923", btn: "#c3c9ee", cat: "#c8cde9" },
    night: { paper: "#0b0d1f", ink: "#e6e9ff", acc: "#ffd23f", btn: "#c3c9ee", cat: "#b9c0ea", glow: "rgba(255,210,63,.28)" }
  },
  {
    id: "solace-in-solitude",
    title: "solace in solitude",
    artist: "Dead Butterflies",
    album: "that feeling in your chest",
    year: 2024,
    src: S + "solace-in-solitude.mp3",
    cover: S + "solace-in-solitude.jpg",
    dur: 242,
    crop: "translate(5%,0%) scale(1.8)",
    tab: "blue",
    doodle: "candle",
    day: { paper: "#eef1f6", ink: "#1f2a3a", acc: "#4f79b8", btn: "#c9d6ea", cat: "#dfe5ee" },
    night: { paper: "#0f1520", ink: "#e8eef7", acc: "#7fa6e6", btn: "#c9d6ea", cat: "#c7d2e2", glow: "rgba(127,166,230,.28)" }
  },
  {
    id: "a-new-kind-of-love",
    title: "A New Kind Of Love",
    artist: "Frou Frou",
    album: "A New Kind Of Love (Demo)",
    year: 2022,
    src: S + "a-new-kind-of-love.mp3",
    cover: S + "a-new-kind-of-love.jpg",
    dur: 259,
    crop: "translate(-19%,8%) scale(1.6)",
    tab: "blue",
    doodle: "tape",
    day: { paper: "#eef3fb", ink: "#1f2a3d", acc: "#5f9ee0", btn: "#cfe0f5", cat: "#d7e3f2" },
    night: { paper: "#111a2b", ink: "#eaf2ff", acc: "#9cc7ff", btn: "#cfe0f5", cat: "#c9d8ee", glow: "rgba(156,199,255,.3)" }
  },
  {
    id: "king-of-pain",
    title: "King Of Pain",
    artist: "The Police",
    album: "Greatest Hits",
    year: 1992,
    src: S + "king-of-pain.mp3",
    cover: S + "king-of-pain.jpg",
    dur: 297,
    tab: "red",
    doodle: "sunspot",
    day: { paper: "#f4f2ee", ink: "#121212", acc: "#d62828", btn: "#e2dfd8", cat: "#e9e6df" },
    night: { paper: "#0e0e0e", ink: "#f2f0ec", acc: "#ff3b3b", btn: "#e2dfd8", cat: "#d9d6cf", glow: "rgba(255,59,59,.3)" }
  },
  {
    id: "blade-running",
    title: "Blade Running",
    artist: "Current Joys",
    album: "Wild Heart",
    year: 2013,
    src: S + "blade-running.mp3",
    cover: S + "blade-running.jpg",
    dur: 191,
    crop: "translate(5%,-13%) scale(1.6)",
    tab: "rust",
    doodle: "streaks",
    day: { paper: "#f3e6df", ink: "#2d1a17", acc: "#b5524a", btn: "#e2c2b6", cat: "#e6cfc4" },
    night: { paper: "#1a0f0d", ink: "#f6e6df", acc: "#e0786b", btn: "#e2c2b6", cat: "#d9b9ac", glow: "rgba(224,120,107,.3)" }
  },
  {
    id: "yume-wo-miru",
    title: "夢を見る",
    artist: "KyonPalm",
    album: "CYBERIA",
    year: 2014,
    src: S + "yume-wo-miru.mp3",
    cover: S + "yume-wo-miru.jpg",
    dur: 118,
    crop: "translate(0%,-8%) scale(1.7)",
    tab: "pink",
    doodle: "grid",
    day: { paper: "#f6e4ea", ink: "#1a1014", acc: "#c76d8a", btn: "#ecc0cf", cat: "#e8c5d1" },
    night: { paper: "#0a0608", ink: "#f7dfe7", acc: "#ff8fb4", btn: "#cf809a", cat: "#d99aae", glow: "rgba(255,143,180,.35)" }
  },
  {
    id: "a-strange-day",
    title: "A Strange Day",
    artist: "The Cure",
    album: "Pornography",
    year: 2005,
    src: S + "a-strange-day.mp3",
    cover: S + "a-strange-day.jpg",
    dur: 303,
    crop: "translate(36%,-18%) scale(1.8)",
    tab: "red",
    doodle: "waves",
    day: { paper: "#f4e4e2", ink: "#1a0d0e", acc: "#b3201a", btn: "#e7a2a4", cat: "#e1b7b5" },
    night: { paper: "#120809", ink: "#fde6e6", acc: "#ff3b30", btn: "#e77379", cat: "#d79a9a", glow: "rgba(255,59,48,.35)" }
  },
  {
    id: "change-your-mind",
    title: "Change Your Mind",
    artist: "CASTLEBEAT",
    src: S + "change-your-mind.mp3",
    cover: S + "change-your-mind.jpg",
    dur: 297,
    tab: "yellow",
    doodle: "notes",
    day: { paper: "#f2f2ee", ink: "#1f1f1f", acc: "#f2c94c", btn: "#e6e6e0", cat: "#f7f7f3" },
    night: { paper: "#1b1c1c", ink: "#f3f3ef", acc: "#ffd75e", btn: "#e6e6e0", cat: "#e8e8e3", glow: "rgba(255,215,94,.26)" }
  },
  {
    id: "controlla",
    title: "controlla",
    artist: "Idealism",
    album: "rainy evening",
    year: 2017,
    src: S + "controlla.mp3",
    cover: S + "controlla.jpg",
    dur: 108,
    tab: "teal",
    doodle: "rain",
    day: { paper: "#e7ebef", ink: "#1c232b", acc: "#3c8d93", btn: "#c5dcdc", cat: "#d0d7df" },
    night: { paper: "#10151b", ink: "#e8eef5", acc: "#6fd0c8", btn: "#c5dcdc", cat: "#bfc9d4", glow: "rgba(111,208,200,.28)" }
  },
  {
    id: "science",
    title: "science (edit)",
    artist: "melodybloom",
    year: 2024,
    src: S + "science.mp3",
    cover: S + "science.jpg",
    dur: 217,
    tab: "teal",
    doodle: "atom",
    day: { paper: "#eef0ea", ink: "#23281f", acc: "#4f8a8b", btn: "#d9d3c3", cat: "#d8d2c2" },
    night: { paper: "#111613", ink: "#e9ede6", acc: "#7cc0bf", btn: "#d9d3c3", cat: "#cbc5b5", glow: "rgba(124,192,191,.28)" }
  },
  {
    id: "shut-up-my-moms-calling",
    title: "Shut up My Moms Calling",
    artist: "Hotel Ugly",
    year: 2022,
    src: S + "shut-up-my-moms-calling.mp3",
    cover: S + "shut-up-my-moms-calling.jpg",
    dur: 164,
    tab: "red",
    doodle: "phone",
    day: { paper: "#f0ece2", ink: "#22201a", acc: "#d8452f", btn: "#c9d9b8", cat: "#ddd5c3" },
    night: { paper: "#14130f", ink: "#f3efe4", acc: "#ff5a40", btn: "#c9d9b8", cat: "#d5cdb9", glow: "rgba(255,90,64,.3)" }
  },
  {
    id: "let-me-grow",
    title: "Let Me Grow",
    artist: "threetwenty",
    year: 2025,
    src: S + "let-me-grow.mp3",
    cover: S + "let-me-grow.jpg",
    dur: 215,
    tab: "orange",
    doodle: "sprout",
    day: { paper: "#f4ede4", ink: "#1b1d2a", acc: "#e8692e", btn: "#b9c6e8", cat: "#e9d8c4" },
    night: { paper: "#11131c", ink: "#f3ece2", acc: "#ff8a4c", btn: "#9fb2e6", cat: "#d9c6b0", glow: "rgba(255,138,76,.3)" }
  },
  {
    id: "i-am-what-i-am",
    title: "i am what i am (slowed)",
    artist: "my head is empty",
    album: "nothing is real, part XXII",
    year: 2025,
    src: S + "i-am-what-i-am.mp3",
    cover: S + "i-am-what-i-am.jpg",
    dur: 165,
    crop: "translate(12%,-70%) scale(2.4)",
    tab: "blue",
    doodle: "bubble",
    day: { paper: "#e8eef2", ink: "#13202a", acc: "#2f8fb8", btn: "#bfd3df", cat: "#cfe0d6" },
    night: { paper: "#0a141c", ink: "#e3eef5", acc: "#5cc0e8", btn: "#a9c6d8", cat: "#9fd0b8", glow: "rgba(92,192,232,.32)" }
  },
  {
    id: "almost-anything",
    title: "Almost Anything",
    artist: "Ryuusennkei",
    album: "Tokyo Sniper",
    year: 2008,
    src: S + "almost-anything.mp3",
    cover: S + "almost-anything.jpg",
    dur: 339,
    crop: "translate(31%,-4%) scale(2.2)",
    tab: "yellow",
    doodle: "skyline",
    day: { paper: "#ecf0e6", ink: "#18221b", acc: "#e2c84a", btn: "#c9d8c2", cat: "#dfe6d6" },
    night: { paper: "#0b120d", ink: "#eef3e8", acc: "#f4dc5c", btn: "#b8cdb0", cat: "#cbd8c2", glow: "rgba(244,220,92,.3)" }
  },
  {
    id: "still-beating",
    title: "Still Beating",
    artist: "Mac DeMarco",
    album: "This Old Dog",
    year: 2017,
    src: S + "still-beating.mp3",
    cover: S + "still-beating.jpg",
    dur: 181,
    tab: "yellow",
    doodle: "heartbeat",
    day: { paper: "#fdf6d3", ink: "#1d1a12", acc: "#f0c419", btn: "#f7dc6f", cat: "#fff3b8" },
    night: { paper: "#1a170b", ink: "#fdf1b8", acc: "#ffe066", btn: "#f5d553", cat: "#efe2a0", glow: "rgba(255,224,102,.3)" }
  },
  {
    id: "take-me",
    title: "Take me",
    artist: "Aethereal Dream ft. Jenny Lupa",
    src: S + "take-me.m4a",
    cover: S + "take-me.jpg",
    dur: 124,
    tab: "red",
    doodle: "clouds",
    day: { paper: "#edf2f7", ink: "#1b2533", acc: "#d9483b", btn: "#c9d8e8", cat: "#e6edf4" },
    night: { paper: "#0e141d", ink: "#e9f0f8", acc: "#ff6152", btn: "#b5c9de", cat: "#cdd9e6", glow: "rgba(255,97,82,.3)" }
  },
  {
    id: "modern-romance",
    title: "Modern Romance",
    artist: "Mr.Kitty",
    album: "ETERNITY",
    year: 2018,
    src: S + "modern-romance.mp3",
    cover: S + "modern-romance.jpg",
    dur: 281,
    crop: "translate(0%,16%) scale(2)",
    tab: "pink",
    doodle: "retro",
    day: { paper: "#f0efed", ink: "#1d1c1c", acc: "#c95c8c", btn: "#dcdad6", cat: "#f4f3f0" },
    night: { paper: "#121212", ink: "#f1f0ee", acc: "#ff5fa8", btn: "#d9d7d3", cat: "#e9e7e3", glow: "rgba(255,95,168,.35)" }
  },
  {
    id: "forever-dumb",
    title: "Forever Dumb",
    artist: "Surf Curse",
    album: "Sad Boys",
    year: 2015,
    src: S + "forever-dumb.flac",
    cover: S + "forever-dumb.jpg",
    dur: 258,
    crop: "translate(-4%,16%) scale(2)",
    tab: "red",
    doodle: "palm",
    day: { paper: "#f1eef0", ink: "#2a2228", acc: "#c8352b", btn: "#a9d3c4", cat: "#e3dde2" },
    night: { paper: "#121417", ink: "#f4f0f2", acc: "#ff5446", btn: "#a9d3c4", cat: "#d9d3d8", glow: "rgba(255,84,70,.3)" }
  }
];

/** "artist · album · year", leaving out what a song doesn't have. */
export const songLine = (song: Song) => [song.artist, song.album, song.year].filter(Boolean).join(" · ");

/** Dark ink on a light colour, light ink on a dark one. */
export function inkOn(hex: string, dark = "#1a1720", light = "#fbf7ef") {
  const n = parseInt(hex.replace("#", ""), 16);
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
  return lum > 0.32 ? dark : light;
}

const esc = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** A song's title on up to three lines of about a dozen letters, so it fits inside the label's circle. */
function labelLines(title: string) {
  const lines: string[] = [];
  for (const word of title.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + word).length <= 12) lines[lines.length - 1] = last + " " + word;
    else lines.push(word);
  }
  return lines.length > 3 ? [...lines.slice(0, 2), lines.slice(2).join(" ").slice(0, 11) + "…"] : lines;
}

/** A record label for a song without a cover: its paper and accent, its title round the middle. */
export function drawnLabel(song: Song) {
  const look = song.day ?? { paper: "#efe7f8", ink: "#2f2a3d", acc: "#f5b3c8", btn: "#cbbaf3", cat: "#c9b6f0" };
  const lines = labelLines(song.title);
  const size = Math.min(26, Math.floor(130 / (Math.max(...lines.map((l) => l.length)) * 0.58)));
  const top = 104 - ((lines.length - 1) * size * 1.05) / 2 - 8;
  const artist = song.artist.length > 22 ? song.artist.slice(0, 21) + "…" : song.artist;
  const small = Math.min(13, Math.floor(120 / (artist.length * 0.62)));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">` +
    `<rect width="200" height="200" fill="${look.paper}"/>` +
    `<circle cx="100" cy="100" r="92" fill="none" stroke="${look.acc}" stroke-width="10"/>` +
    `<circle cx="100" cy="100" r="74" fill="none" stroke="${look.ink}" stroke-width="2" stroke-dasharray="3 5"/>` +
    lines
      .map((line, k) => `<text x="100" y="${(top + k * size * 1.05).toFixed(1)}" text-anchor="middle" font-family="Georgia,serif" font-size="${size}" font-weight="700" fill="${look.ink}">${esc(line)}</text>`)
      .join("") +
    `<text x="100" y="${(top + (lines.length - 1) * size * 1.05 + 24).toFixed(1)}" text-anchor="middle" font-family="Consolas,monospace" font-size="${small}" fill="${look.ink}" opacity=".75">${esc(artist)}</text>` +
    `</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

/** The picture on the record (and on the shelf's turntable): the cover, or the drawn label. */
export const songCover = (song: Song) => song.cover ?? drawnLabel(song);
