"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PREVIEW_PATH, type PreviewMessage, type PreviewPost } from "@/lib/blog-preview";

type Mode = "desktop" | "phone";
// the window the post is drawn in: a laptop, or a phone; then shrunk to fit the panel
const WIDTH: Record<Mode, number> = { desktop: 1280, phone: 390 };
const themeNow = (): PreviewPost["theme"] => (document.documentElement.dataset.theme === "night" ? "night" : "day");

// The post as the site shows it: the real page in a frame the width of a laptop or a phone, scaled to fit,
// in the admin's Day or Night. It follows the text as you type and scrolls like the page.
export function PostPreview({ data }: { data: Omit<PreviewPost, "theme"> }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>("desktop");
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<PreviewPost["theme"]>("day");
  const latest = useRef(data);
  latest.current = data;

  const send = useCallback(() => {
    const target = frame.current?.contentWindow;
    if (!target) return;
    const message: PreviewMessage = { type: "lyka-preview:post", data: { ...latest.current, theme: themeNow() } };
    target.postMessage(message, window.location.origin);
  }, []);

  // a phone-sized admin starts on the phone view
  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) setMode("phone");
    setTheme(themeNow());
    const observer = new MutationObserver(() => setTheme(themeNow()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type !== "lyka-preview:ready") return;
      setReady(true);
      send();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  useEffect(() => {
    if (ready) send();
  }, [data, theme, ready, send]);

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () => setSize({ w: element.clientWidth, h: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const width = WIDTH[mode];
  // inside the window's 2.5px edge
  const room = { w: Math.max(0, size.w - 6), h: Math.max(0, size.h - 6) };
  const scale = room.w ? Math.min(1, room.w / width) : 0;
  return (
    <div className="a-preview">
      <div className="a-preview-bar">
        <span className="a-label !mb-0">On the site</span>
        <div role="radiogroup" aria-label="Preview size" className="flex gap-1.5">
          {(["desktop", "phone"] as const).map((option) => (
            <button key={option} type="button" role="radio" aria-checked={mode === option} className="a-chip a-chip--small" onClick={() => setMode(option)}>
              {option === "desktop" ? "Desktop" : "Phone"}
            </button>
          ))}
        </div>
      </div>
      <div ref={box} className="a-preview-box">
        <div className="a-preview-window" style={{ width: width * scale, height: room.h }}>
          <iframe
            ref={frame}
            src={PREVIEW_PATH}
            title="How the post shows on the site"
            style={{ width, height: scale ? room.h / scale : room.h, transform: `scale(${scale})` }}
          />
        </div>
      </div>
    </div>
  );
}
