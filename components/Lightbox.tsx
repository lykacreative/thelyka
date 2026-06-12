"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect } from "react";
import { FaXmark } from "react-icons/fa6";
import { categoryLabels } from "@/lib/copy";
import type { PortfolioItem } from "@/lib/portfolio";

type LightboxProps = {
  item: PortfolioItem | null;
  onClose: () => void;
};

export function Lightbox({ item, onClose }: LightboxProps) {
  useEffect(() => {
    if (!item) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-3 backdrop-blur-xl sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${item.title} details`}
        >
          <motion.div
            className="relative flex flex-col md:grid max-h-[90vh] w-full max-w-6xl overflow-hidden border border-[var(--frame)] bg-[var(--modal-bg)] text-[var(--modal-fg)] shadow-[0_30px_110px_var(--shadow)] backdrop-blur-2xl md:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.45fr)]"
            initial={{ y: 20, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 14, scale: 0.985, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-[var(--frame)] bg-[var(--page-bg-solid)] text-[var(--page-fg)] backdrop-blur transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
              aria-label="Close lightbox"
            >
              <FaXmark aria-hidden="true" className="h-4 w-4" />
            </button>

            <div className="relative h-[40vh] shrink-0 bg-[var(--panel-bg)] md:h-auto md:min-h-[72vh]">
              <Image src={item.src} alt={`${item.title} by lyka mimics`} fill sizes="90vw" className="object-contain" />
            </div>

            <div className="flex flex-col border-t border-[var(--frame)] bg-[var(--modal-bg)] md:border-l md:border-t-0 overflow-y-auto min-h-0 flex-1">
              <div className="p-6 md:pr-20">
                <p className="font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-bg)]">
                  {categoryLabels[item.category]}
                </p>
                <h2 className="mt-4 font-display text-[28px] font-semibold leading-[1.1] tracking-normal sm:text-[44px] break-words">
                  {item.title}
                </h2>
              </div>

              <dl className="grid content-start border-y border-[var(--frame)] font-sans text-sm">
                <div className="grid grid-cols-[5.5rem_1fr] border-b border-[var(--frame)]">
                  <dt className="p-3 uppercase tracking-normal text-[var(--panel-bg)] sm:p-4">year</dt>
                  <dd className="border-l border-[var(--frame)] p-3 text-[var(--modal-fg)] sm:p-4">{item.year}</dd>
                </div>
                {item.date ? (
                  <div className="grid grid-cols-[5.5rem_1fr]">
                    <dt className="p-3 uppercase tracking-normal text-[var(--panel-bg)] sm:p-4">date</dt>
                    <dd className="border-l border-[var(--frame)] p-3 text-[var(--modal-fg)] sm:p-4">{item.date}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="grow p-6">
                <p className="font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-bg)]">artist note</p>
                <p className="mt-4 font-sans text-sm leading-6 text-[var(--modal-fg)]">{item.note || "No note yet."}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
