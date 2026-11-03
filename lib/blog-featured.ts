// Which blog posts the homepage shows. Pure (no imports) so the tests can load it.

export const HOME_POST_COUNT = 3;

// The admin's "Feature on homepage" switch: only a real true counts.
export function readFeaturedFlag(value: unknown): boolean {
  return value === true;
}

// The featured posts, newest first, up to three. If none is featured, the newest three.
export function homePosts<T extends { date: string; featured?: boolean }>(posts: T[], max = HOME_POST_COUNT): T[] {
  const newest = posts.slice().sort((a, b) => b.date.localeCompare(a.date));
  const featured = newest.filter((post) => post.featured === true);
  return (featured.length ? featured : newest).slice(0, Math.max(0, max));
}
