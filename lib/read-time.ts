// Minutes to read a post (200 words a minute, at least 1). Shared by the site and the admin's preview.
export function calculateReadTime(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
