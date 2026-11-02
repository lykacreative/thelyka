'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaChevronLeft, FaChevronRight, FaXmark } from 'react-icons/fa6';

export type BlogImage = {
  src: string;
  alt: string;
};

type BlogImageViewerProps = {
  images: BlogImage[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

// A blog image shown bigger over the post, with arrows (and keys / swipes) through the post's other images.
export function BlogImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
}: BlogImageViewerProps) {
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  const count = images.length;
  const image = index !== null ? images[index] ?? null : null;
  const hasSeveral = count > 1;

  const step = useCallback(
    (direction: 1 | -1) => {
      if (index === null || count < 2) return;
      onIndexChange((index + direction + count) % count);
    },
    [index, count, onIndexChange],
  );

  useEffect(() => {
    if (!image) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    }

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [image, onClose, step]);

  // Load the images on either side, so the arrows show them straight away.
  useEffect(() => {
    if (index === null || count < 2) return;
    for (const neighbour of [index - 1, index + 1]) {
      const preload = new window.Image();
      preload.src = images[(neighbour + count) % count].src;
    }
  }, [index, count, images]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {image ? (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--overlay)] p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
          onTouchStart={(event) => {
            touchStartX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStartX.current;
            touchStartX.current = null;
            const end = event.changedTouches[0]?.clientX;
            if (start === null || end === undefined) return;
            if (Math.abs(end - start) > 50) step(end < start ? 1 : -1);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={image.alt || 'Blog image'}
        >
          <div className="flex w-full min-h-0 items-center justify-between gap-4">
            {hasSeveral ? (
              <ArrowButton direction={-1} onStep={step} className="hidden md:grid" />
            ) : null}

            <div className="flex min-w-0 flex-1 justify-center">
              <motion.div
                key={`${image.src}-${index}`}
                className="relative"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onMouseDown={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
              >
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="
                    absolute left-3 top-3 z-10
                    grid h-8 w-8 place-items-center
                    rounded-full border border-[var(--modal-fg)]
                    bg-[var(--modal-bg)] text-[var(--modal-fg)]
                    shadow-md transition-all duration-200
                    hover:bg-[var(--modal-fg)] hover:text-[var(--modal-bg)]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[var(--frame)]
                  "
                >
                  <FaXmark className="h-5 w-5" />
                </button>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.src}
                  alt={image.alt}
                  className="
                    block h-auto w-auto object-contain
                    border border-[var(--frame)]
                    max-h-[calc(100dvh-6.5rem)] max-w-[calc(100vw-1.5rem)]
                    md:max-h-[calc(100dvh-7rem)] md:max-w-[calc(100vw-11rem)]
                  "
                />
              </motion.div>
            </div>

            {hasSeveral ? (
              <ArrowButton direction={1} onStep={step} className="hidden md:grid" />
            ) : null}
          </div>

          <div
            className="flex w-full max-w-xl items-center justify-between gap-4 md:justify-center"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {hasSeveral ? (
              <ArrowButton direction={-1} onStep={step} className="grid md:hidden" />
            ) : null}

            <p className="min-w-0 text-center font-sans text-xs font-medium uppercase tracking-normal text-[var(--panel-fg)]">
              {image.alt ? <span className="block truncate">{image.alt}</span> : null}
              {hasSeveral ? (
                <span className="mt-1 block opacity-70">
                  {(index ?? 0) + 1} / {count}
                </span>
              ) : null}
            </p>

            {hasSeveral ? (
              <ArrowButton direction={1} onStep={step} className="grid md:hidden" />
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function ArrowButton({
  direction,
  onStep,
  className,
}: {
  direction: 1 | -1;
  onStep: (direction: 1 | -1) => void;
  className: string;
}) {
  const Icon = direction === 1 ? FaChevronRight : FaChevronLeft;

  return (
    <button
      type="button"
      onClick={() => onStep(direction)}
      onMouseDown={(event) => event.stopPropagation()}
      aria-label={direction === 1 ? 'Next image' : 'Previous image'}
      className={`
        ${className}
        h-11 w-11 shrink-0 place-items-center
        border border-[var(--modal-fg)]
        bg-[var(--modal-bg)] text-[var(--modal-fg)]
        shadow-md transition-all duration-200
        hover:bg-[var(--modal-fg)] hover:text-[var(--modal-bg)]
        ${direction === 1 ? 'hover:translate-x-0.5' : 'hover:-translate-x-0.5'}
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-[var(--frame)]
      `}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
