// Unit tests for the public site's pure logic: homepage blog picks, item keys, fixtures, blog search.
// Run: npm test  (Node 22.18+ / 24 strips the TypeScript types itself)
import { test } from "node:test";
import assert from "node:assert/strict";

import { homePosts, readFeaturedFlag, HOME_POST_COUNT } from "../lib/blog-featured.ts";
import {
  slugify,
  toSiteItems,
  coverOf,
  cleanSiteNote,
  formatDate,
  itemDate,
  newestItem,
  postMatches,
  sortPosts,
  plainText
} from "../lib/site-items.ts";
import { fixtureDirFrom, fixtureItems, fixturePosts, FIXTURE_FEATURED, readTimeOf } from "../lib/fixture-data.ts";
import { parseBlogBlocks } from "../lib/blog-blocks.ts";
import { music } from "../lib/site/music.ts";
import { purrSamples, purr, PURR_SECONDS } from "../lib/site/purr.ts";
import { rng } from "../lib/site/client.ts";

const post = (slug: string, date: string, featured?: boolean) => ({ slug, date, featured });

// ---------------------------------------------------------------- blog: featured on the homepage

test("featured flag: only a real true turns it on", () => {
  assert.equal(readFeaturedFlag(true), true);
  for (const value of [false, "true", "on", 1, null, undefined, {}]) assert.equal(readFeaturedFlag(value), false);
});

test("home posts: the featured ones, newest first, at most three", () => {
  const posts = [
    post("a", "2026-01-01", true),
    post("b", "2026-05-01"),
    post("c", "2026-03-01", true),
    post("d", "2026-07-01", true),
    post("e", "2026-02-01", true),
    post("f", "2026-08-01")
  ];
  assert.equal(HOME_POST_COUNT, 3);
  assert.deepEqual(homePosts(posts).map((p) => p.slug), ["d", "c", "e"]);
});

test("home posts: one featured post shows alone; none featured = the newest three", () => {
  assert.deepEqual(homePosts([post("a", "2026-01-01"), post("b", "2025-01-01", true), post("c", "2026-02-01")]).map((p) => p.slug), ["b"]);
  const none = [post("a", "2026-01-01"), post("b", "2026-04-01"), post("c", "2025-12-31"), post("d", "2026-03-01")];
  assert.deepEqual(homePosts(none).map((p) => p.slug), ["b", "d", "a"]);
  assert.deepEqual(homePosts([]), []);
  assert.deepEqual(homePosts(none, 0), []);
});

test("home posts: the input list is left as it was", () => {
  const posts = [post("a", "2026-01-01"), post("b", "2026-04-01", true)];
  homePosts(posts);
  assert.deepEqual(posts.map((p) => p.slug), ["a", "b"]);
});

// ---------------------------------------------------------------- items: keys, covers, notes

type Raw = Parameters<typeof toSiteItems>[0][number];
const item = (over: Partial<Raw>): Raw => ({
  id: over.title ?? "x",
  src: "https://res.cloudinary.com/dgow1oztd/image/upload/v1/a.jpg",
  category: "design",
  year: "2026",
  title: "Untitled",
  note: "",
  variants: ["https://res.cloudinary.com/dgow1oztd/image/upload/v1/a.jpg"],
  width: 1000,
  height: 1250,
  variantDimensions: {},
  ...over
});

test("slugs: accents folded, punctuation collapsed, never empty", () => {
  assert.equal(slugify("D017: CUT-OUT"), "d017-cut-out");
  assert.equal(slugify("Zdzisław Beksiński"), "zdzisław-beksinski");
  assert.equal(slugify("Café · Noir!"), "cafe-noir");
  assert.equal(slugify("???"), "item");
});

test("item keys: category/slug, same titles get the date, then a counter", () => {
  const keys = toSiteItems([
    item({ title: "Poster", date: "2026-02-01" }),
    item({ title: "Poster", date: "2026-01-01" }),
    item({ title: "Poster", category: "arts", artType: "Sketches" }),
    item({ title: "Twin", date: "2025-01-01" }),
    item({ title: "Twin", date: "2025-01-01" })
  ]).map((i) => i.key);
  assert.deepEqual(keys, ["design/poster-2026-02-01", "design/poster-2026-01-01", "arts/poster", "design/twin-2025-01-01", "design/twin-2025-01-01-2"]);
});

test("site items: gallery images keep their stored size and the cover's place", () => {
  const a = "https://res.cloudinary.com/dgow1oztd/image/upload/v1/a.jpg";
  const b = "https://res.cloudinary.com/dgow1oztd/image/upload/v1/b.jpg";
  const [one] = toSiteItems([
    item({
      title: "Gallery",
      src: b,
      gallery: [
        { src: a, width: 1280, height: 1600 },
        { src: b, width: 2000, height: 1000 }
      ],
      coverIndex: 0,
      artType: undefined,
      reviewType: "Movies",
      category: "reviews",
      note: "$15"
    })
  ]);
  assert.equal(one.cover, 1, "cover follows the item's src");
  assert.deepEqual(coverOf(one), { src: b, w: 2000, h: 1000 });
  assert.deepEqual(one.images[0], { src: a, w: 1280, h: 1600 });
  assert.equal(one.type, "Movies");
  assert.equal(one.note, "");
  const [single] = toSiteItems([item({ title: "Single", variantDimensions: {} })]);
  assert.deepEqual(single.images, [{ src: "https://res.cloudinary.com/dgow1oztd/image/upload/v1/a.jpg", w: 1000, h: 1250 }]);
});

test("notes: leftover data references are dropped, real notes kept with line breaks", () => {
  assert.equal(cleanSiteNote("$15"), "");
  assert.equal(cleanSiteNote(" $3 "), "");
  assert.equal(cleanSiteNote("Line one\nLine two"), "Line one\nLine two");
  assert.equal(cleanSiteNote(undefined), "");
});

test("dates: day month year, the year when there's no day", () => {
  assert.equal(formatDate("2026-06-29"), "29 Jun 2026");
  assert.equal(formatDate("2025-01-05"), "5 Jan 2025");
  assert.equal(itemDate({ date: "", year: "2024" }), "2024");
  const items = toSiteItems([item({ title: "Old", date: "2025-01-01" }), item({ title: "New", date: "2026-03-01" })]);
  assert.equal(newestItem(items)?.title, "New");
  assert.equal(newestItem([]), null);
});

// ---------------------------------------------------------------- fixtures

test("fixtures: items map to the data functions' shape, stand-ins featured in order", () => {
  const items = fixtureItems({
    items: [
      { category: "design", title: FIXTURE_FEATURED[1], date: "2026-01-02", year: "2026", note: "", coverIndex: 0, images: [{ src: "https://x/a.jpg", w: 10, h: 20 }] },
      { category: "arts", type: "Photography", title: "Field", date: "2026-03-01", year: "2026", coverIndex: 1, images: [{ src: "https://x/b.jpg", w: 5, h: 5 }, { src: "https://x/c.jpg", w: 6, h: 9 }] },
      { category: "nope", title: "Skip me", images: [{ src: "https://x/d.jpg" }] },
      { category: "design", title: "No images", images: [] }
    ]
  });
  assert.equal(items.length, 2);
  assert.equal(items[0].title, "Field", "newest first");
  assert.equal(items[0].src, "https://x/c.jpg");
  assert.equal(items[0].artType, "Photography");
  assert.equal(items[0].gallery?.length, 2);
  assert.equal(items[1].featured, 2);
  assert.equal(items[1].gallery, undefined);
  assert.deepEqual(items[1].variantDimensions["https://x/a.jpg"], { width: 10, height: 20 });
});

test("fixtures: posts get a read time and stay unfeatured unless the file says so", () => {
  const posts = fixturePosts([
    { slug: "a", title: "A", date: "2026-01-01", content: "word ".repeat(450) },
    { slug: "b", title: "B", date: "2026-02-01", content: "", featured: true },
    { title: "broken" }
  ]);
  assert.deepEqual(posts.map((p) => [p.slug, p.readTime, p.featured]), [["b", 1, true], ["a", 3, false]]);
  assert.equal(readTimeOf(""), 1);
});

// ---------------------------------------------------------------- blog index: search and sort

test("blog search: every word, any field, case and accents ignored", () => {
  const p = { title: "Zdzisław Beksiński, Photographing Dreams", excerpt: "On the painter", text: "He lived in Sanok." };
  assert.equal(postMatches(p, ""), true);
  assert.equal(postMatches(p, "beksinski"), true);
  assert.equal(postMatches(p, "SANOK dreams"), true);
  assert.equal(postMatches(p, "sanok venus"), false);
});

test("blog sort: newest, oldest, title", () => {
  const posts = [
    { title: "b", date: "2026-01-01" },
    { title: "C", date: "2026-03-01" },
    { title: "a", date: "2025-01-01" }
  ];
  assert.deepEqual(sortPosts(posts, "newest").map((p) => p.title), ["C", "b", "a"]);
  assert.deepEqual(sortPosts(posts, "oldest").map((p) => p.title), ["a", "b", "C"]);
  assert.deepEqual(sortPosts(posts, "title").map((p) => p.title), ["a", "b", "C"]);
});

test("plain text for search drops markdown, keeps words", () => {
  assert.equal(plainText("## Head\n\n![alt](https://x/y.jpg)\n:::split\nSome **bold** [link](https://z)\n:::"), "Head Some bold link");
});

// ---------------------------------------------------------------- blog post blocks (same parser as the admin preview)

test("blog blocks: :::split pieces come out with their image and side", () => {
  const blocks = parseBlogBlocks("Intro\n\n:::split right\n![A painting](https://x/p.jpg)\n:::\nText beside.\n:::\n\nOutro");
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks[1], { type: "split", imageSrc: "https://x/p.jpg", imageAlt: "A painting", text: "Text beside.", side: "right" });
  assert.equal(blocks[0].type, "markdown");
  assert.equal(parseBlogBlocks(":::split\nno image\n:::\ntext\n:::")[0].type, "markdown");
});

// ---------------------------------------------------------------- the shared song (nav player + shelf turntable)

test("music: other controls drive the player's one audio and follow its state, both ways", () => {
  assert.deepEqual(music.get(), { ready: false, playing: false, track: null });
  music.toggle(); // nothing to drive yet: no error, nothing changes
  assert.equal(music.get().playing, false);

  // a stand-in for the nav player: its audio reports play / pause back to the store, like the real one
  const audio = Object.assign(new EventTarget(), { paused: true });
  const report = () => music.set({ playing: !audio.paused });
  const player = {
    audio: audio as unknown as HTMLAudioElement,
    toggle: () => {
      audio.paused = !audio.paused;
      report();
    },
    play: () => {
      audio.paused = false;
      report();
    },
    pause: () => {
      audio.paused = true;
      report();
    }
  };
  const seen: boolean[] = [];
  const stop = music.subscribe(() => seen.push(music.get().playing));
  const detach = music.attach(player);
  assert.equal(music.get().ready, true);

  music.toggle(); // the turntable's button
  assert.equal(audio.paused, false);
  assert.equal(music.get().playing, true);
  player.toggle(); // the nav player's own button
  assert.equal(music.get().playing, false);
  music.play();
  music.play(); // already playing: no second start
  assert.equal(music.get().playing, true);
  music.pause();
  assert.deepEqual(seen, [false, true, false, true, false]);

  // the audio element's own events keep the store right too (the song ends, the source is swapped)
  audio.paused = false;
  audio.dispatchEvent(new Event("play"));
  assert.equal(music.get().playing, true);
  audio.paused = true;
  audio.dispatchEvent(new Event("ended"));
  assert.equal(music.get().playing, false);

  const track = { title: "cats in the cold", artist: "mage tears", cover: "/media/cats-in-the-cold-cover.jpg" };
  music.set({ track });
  assert.equal(music.get().track, track);

  detach();
  assert.deepEqual(music.get(), { ready: false, playing: false, track });
  audio.paused = false;
  audio.dispatchEvent(new Event("play")); // detached: no longer followed
  assert.equal(music.get().playing, false);
  stop();
});

// ---------------------------------------------------------------- fixtures never reach a deploy

test("fixtures: only on this PC; never on Vercel or CI; a production build needs the second switch", () => {
  const dir = "../redesign/data";
  assert.equal(fixtureDirFrom({}), null);
  assert.equal(fixtureDirFrom({ LYKA_FIXTURES: "  " }), null);
  assert.equal(fixtureDirFrom({ LYKA_FIXTURES: dir, NODE_ENV: "development" }), dir);
  // a deploy: never, whatever else is set
  for (const deploy of [{ VERCEL: "1" }, { VERCEL_ENV: "preview" }, { VERCEL_ENV: "production" }, { CI: "true" }]) {
    assert.equal(fixtureDirFrom({ LYKA_FIXTURES: dir, NODE_ENV: "development", ...deploy }), null);
    assert.equal(fixtureDirFrom({ LYKA_FIXTURES: dir, NODE_ENV: "production", LYKA_FIXTURES_BUILD: "1", ...deploy }), null);
  }
  // a production build or server: a stray LYKA_FIXTURES alone does nothing
  assert.equal(fixtureDirFrom({ LYKA_FIXTURES: dir, NODE_ENV: "production" }), null);
  assert.equal(fixtureDirFrom({ LYKA_FIXTURES: dir, NODE_ENV: "production", LYKA_FIXTURES_BUILD: "true" }), null);
  assert.equal(fixtureDirFrom({ LYKA_FIXTURES: dir, NODE_ENV: "production", LYKA_FIXTURES_BUILD: "1" }), dir);
});

test("purr: a soft two-breath rumble about 25 pulses a second, and silent outside a browser", () => {
  const rate = 8000;
  const s = purrSamples(rate, rng(7));
  assert.equal(s.length, Math.round(rate * PURR_SECONDS));
  let peak = 0;
  for (const v of s) peak = Math.max(peak, Math.abs(v));
  assert.ok(Math.abs(peak - 0.5) < 1e-6, `peak ${peak}`);
  // it starts and ends in silence (no click), with a gap between the breaths
  const level = (from: number, to: number) => {
    let sum = 0;
    for (let i = Math.round(from * rate); i < Math.round(to * rate); i++) sum += s[i] * s[i];
    return Math.sqrt(sum / (Math.round(to * rate) - Math.round(from * rate)));
  };
  assert.equal(level(0, 0.05), 0);
  assert.equal(level(0.95, 1.05), 0);
  assert.equal(level(2.15, PURR_SECONDS), 0);
  // the second breath (out) is the fuller one
  assert.ok(level(1.3, 1.9) > level(0.25, 0.75) * 1.2, "the out-breath is louder");
  // the flutter: the loudness pulses about 26 times a second on the out-breath
  const env = Array.from(s.subarray(Math.round(1.3 * rate), Math.round(1.9 * rate)), (v) => v * v);
  const mean = env.reduce((a, b) => a + b, 0) / env.length;
  let best = 0;
  let bestHz = 0;
  for (let hz = 15; hz <= 40; hz++) {
    const lag = Math.round(rate / hz);
    let c = 0;
    for (let i = 0; i + lag < env.length; i++) c += (env[i] - mean) * (env[i + lag] - mean);
    if (c > best) [best, bestHz] = [c, hz];
  }
  assert.ok(bestHz >= 24 && bestHz <= 28, `pulses ${bestHz}/s`);
  // the same seed makes the same purr
  assert.deepEqual(purrSamples(rate, rng(7)).subarray(9000, 9010), s.subarray(9000, 9010));
  // no window (the server): nothing plays
  assert.equal(purr(), 0);
});
