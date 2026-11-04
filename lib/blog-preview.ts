// The admin's blog preview: the editor (components/admin/PostPreview.tsx) shows /blog-preview in a frame and
// sends it the post as you type; the frame (components/admin/BlogPreviewFrame.tsx) draws it with the site's own
// page and stylesheet. Same origin only. Types and names only, safe to import anywhere.
import type { ZineSheetPost } from "@/components/site/ZineSheet";

export const PREVIEW_PATH = "/blog-preview";

export type PreviewPost = {
  post: ZineSheetPost;
  index: number;
  total: number;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
  theme: "day" | "night";
};

export type PreviewMessage = { type: "lyka-preview:ready" } | { type: "lyka-preview:post"; data: PreviewPost };

type Listed = { slug: string; title: string; date: string };

/** Where the post sits among the others, as the site lists them (newest first): its "Blog · 02 / 05" and the
 *  posts either side. */
export function placeAmong(others: Listed[], me: Listed) {
  const list = [...others, me].sort((a, b) => b.date.localeCompare(a.date));
  const index = list.indexOf(me);
  const near = (entry: Listed | undefined) => (entry ? { slug: entry.slug, title: entry.title } : null);
  return { index, total: list.length, prev: near(list[index - 1]), next: near(list[index + 1]) };
}
