import fs from "node:fs";
import path from "node:path";
import { fixtureItems, fixturePosts } from "@/lib/fixture-data";

// Local runs without a database: LYKA_FIXTURES=<folder with items.json and blogs.json> makes the data
// functions (lib/portfolio.ts, lib/blogs.ts) serve those files instead of MongoDB. Never on a Vercel deploy
// (VERCEL is set there for builds and functions), so a stray variable can't put test data on the live site.
export function fixturesDir(): string | null {
  const dir = (process.env.LYKA_FIXTURES ?? "").trim();
  if (!dir || process.env.VERCEL) return null;
  return path.resolve(dir);
}

let warned = false;

function readJson(file: string): unknown {
  const dir = fixturesDir();
  if (!dir) return null;
  if (!warned) {
    warned = true;
    console.warn(`[lyka] Serving fixture data from ${dir} (LYKA_FIXTURES). Not for a deploy.`);
  }
  // Local files only (never on Vercel): keep the bundler from tracing the whole project into the server output.
  return JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ dir, file), "utf8"));
}

export function readFixtureItems() {
  return fixtureItems(readJson("items.json"));
}

export function readFixturePosts() {
  return fixturePosts(readJson("blogs.json"));
}
