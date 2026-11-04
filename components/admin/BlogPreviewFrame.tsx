"use client";

import { useEffect, useState } from "react";
import { ZinePage } from "@/components/site/ZinePage";
import { ZineSheet } from "@/components/site/ZineSheet";
import type { PreviewMessage, PreviewPost } from "@/lib/blog-preview";

// Inside the admin's preview frame: the post page exactly as the site draws it (same components, same
// stylesheet, a real window width, so phone and desktop layouts both apply), redrawn each time the editor sends
// the post. Back and the links to other posts open the live pages in a new tab; pictures open bigger as on the site.
export function BlogPreviewFrame() {
  const [data, setData] = useState<PreviewPost | null>(null);

  useEffect(() => {
    const origin = window.location.origin;
    const onMessage = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== origin || event.source !== window.parent || event.data?.type !== "lyka-preview:post") return;
      const next = event.data.data;
      const html = document.documentElement;
      if (html.dataset.theme !== next.theme) html.dataset.theme = next.theme;
      setData(next);
    };
    window.addEventListener("message", onMessage);
    if (window.parent !== window) window.parent.postMessage({ type: "lyka-preview:ready" } satisfies PreviewMessage, origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!data) return <main className="zine zpage" id="main" aria-busy="true" />;
  return (
    <ZinePage backLabel="Back" fallback="/blogs" onBack={() => window.open("/blogs", "_blank", "noopener")}>
      <ZineSheet post={data.post} index={data.index} total={data.total} prev={data.prev} next={data.next} newTab />
    </ZinePage>
  );
}
