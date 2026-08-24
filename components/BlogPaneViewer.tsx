"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { FaXmark } from "react-icons/fa6";
import { BlogRenderer } from "@/components/BlogRenderer";

type BlogPaneViewerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  date: string;
  excerpt: string;
  cover: string;
  year: string;
  slug: string;
  content: string;
};

export function BlogPaneViewer({
  open,
  onClose,
  title,
  date,
  excerpt,
  cover,
  year,
  slug,
  content
}: BlogPaneViewerProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const coverSrc = cover ? (cover.startsWith("/media/") ? cover : `/media/${year}/${cover}`) : null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-[var(--overlay)] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Blog post pane viewer"
        >
          <div
            className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--frame)] bg-[var(--modal-bg)] px-4 py-2.5 sm:px-6"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="inline-flex items-center gap-2 font-sans text-[10px] font-medium uppercase tracking-normal text-[var(--modal-fg)]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--panel-bg)]" aria-hidden="true" />
              Pane view — how your blog looks on its own
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 border border-[var(--frame)] bg-[var(--page-bg-solid)] px-3 py-1 font-sans text-[11px] font-medium uppercase tracking-normal text-[var(--page-fg)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
              aria-label="Close pane view"
            >
              <FaXmark aria-hidden="true" className="h-3 w-3" />
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <motion.div
              className="mx-auto w-full max-w-[720px] px-4 pb-20 pt-8 sm:px-6"
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <article className="border border-[var(--frame)] bg-[var(--page-bg-solid)] px-5 pb-10 pt-7 shadow-[0_24px_80px_var(--shadow)] sm:px-8 sm:pb-14 sm:pt-9">
                <header className="mb-8 border-b border-[var(--frame)] pb-6">
                  {date ? (
                    <time className="font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-bg)]">
                      {date}
                    </time>
                  ) : null}
                  <h1 className="mt-2 font-display text-[28px] font-normal leading-[1.1] tracking-normal sm:text-[44px]">
                    {title || "Untitled post"}
                  </h1>
                  {excerpt ? (
                    <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-[var(--page-fg)]/70">
                      {excerpt}
                    </p>
                  ) : null}
                </header>

                {coverSrc ? (
                  <div className="relative mb-8 aspect-[16/9] w-full overflow-hidden border border-[var(--frame)] bg-[var(--panel-bg)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverSrc}
                      alt={title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}

                {content.trim() ? (
                  <div className="lyka-prose">
                    <BlogRenderer content={content} />
                  </div>
                ) : (
                  <p className="font-sans text-sm italic text-[var(--page-fg)]/50">
                    No content yet. Start writing in the editor to see it here.
                  </p>
                )}
              </article>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
