'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { FaXmark } from 'react-icons/fa6';
import { categoryLabels } from '@/lib/copy';
import type { PortfolioItem } from '@/lib/portfolio';

type LightboxProps = {
  item: PortfolioItem | null;
  onClose: () => void;
};

export function Lightbox({ item, onClose }: LightboxProps) {
  const [variantIndex, setVariantIndex] = useState(0);

  useEffect(() => {
    setVariantIndex(0);
  }, [item]);

  useEffect(() => {
    if (!item) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [item, onClose]);

  const currentSrc = item?.variants[variantIndex] ?? item?.src;

  const currentDimensions = currentSrc
    ? item?.variantDimensions[currentSrc] ?? {
        width: item?.width ?? 1,
        height: item?.height ?? 1,
      }
    : null;

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          className="
            fixed inset-0 z-50
            flex items-center justify-center
            bg-[var(--overlay)]
            p-3 sm:p-6
          "
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`${item.title} details`}
        >
          <motion.div
            className="
              relative
              w-full max-w-[90vw]
              max-h-[calc(100dvh-1.5rem)]
              overflow-y-auto
              lg:w-fit
              lg:max-h-[80vh]
              lg:overflow-hidden
              lg:pr-80
            "
            initial={{ y: 20, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 14, scale: 0.985, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* IMAGE + CLOSE BUTTON */}
            {currentDimensions && (
              <div className="relative w-full shrink-0 md:w-auto">
                {/* CLOSE BUTTON – top-left corner of the image */}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="
                    absolute left-3 top-3 z-50
                    grid h-8 w-8 place-items-center
                    rounded-full border border-[var(--modal-fg)]
                    bg-[var(--modal-bg)] text-[var(--modal-fg)]
                    shadow-md transition
                    hover:bg-[var(--modal-fg)] hover:text-[var(--modal-bg)]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]
                    md:left-4 md:top-4
                  "
                >
                  <FaXmark className="h-5 w-5" />
                </button>

                <Image
                  src={currentSrc!}
                  alt={`${item.title} by lyka mimics`}
                  width={currentDimensions.width}
                  height={currentDimensions.height}
                  sizes="(max-width: 1024px) 90vw, 80vh"
                  className="
                    block h-auto w-full max-w-full object-contain
                    lg:max-h-[80vh] lg:w-auto
                  "
                  priority
                />
              </div>
            )}

            {/* DESCRIPTION */}
            <div
              className="
                flex w-full flex-col bg-[var(--modal-bg)]
                lg:absolute lg:top-0 lg:right-0
                lg:h-full lg:w-80
                lg:overflow-y-auto
                lg:border-l lg:border-[var(--frame)]
              "
            >
              <div className="p-6 px-4">
                <p className="font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-bg)]">
                  {categoryLabels[item.category]}
                </p>
                <h2 className="mt-4 break-words font-display text-[28px] font-semibold leading-[1.1] tracking-normal text-[var(--modal-fg)] sm:text-[44px]">
                  {item.title}
                </h2>
              </div>

              <dl className="grid content-start border-y border-[var(--frame)] font-sans text-sm">
                <div className="grid grid-cols-[5.5rem_1fr] border-b border-[var(--frame)]">
                  <dt className="p-3 uppercase tracking-normal text-[var(--panel-bg)] sm:p-4">
                    year
                  </dt>
                  <dd className="border-l border-[var(--frame)] p-3 text-[var(--modal-fg)] sm:p-4">
                    {item.year}
                  </dd>
                </div>

                {item.date ? (
                  <div className="grid grid-cols-[5.5rem_1fr]">
                    <dt className="p-3 uppercase tracking-normal text-[var(--panel-bg)] sm:p-4">
                      date
                    </dt>
                    <dd className="border-l border-[var(--frame)] p-3 text-[var(--modal-fg)] sm:p-4">
                      {item.date}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="grow p-6">
                <p className="font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-bg)]">
                  artist note
                </p>
                <p className="mt-4 font-sans text-sm leading-6 text-[var(--modal-fg)]">
                  {item.note || 'No note yet.'}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}