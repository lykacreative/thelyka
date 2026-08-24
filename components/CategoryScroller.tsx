"use client";

import { animate, motion, useAnimationFrame, useMotionValue, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CategoryCard } from "@/components/CategoryCard";
import { Lightbox } from "@/components/Lightbox";
import { categoryLabels } from "@/lib/copy";
import type { Category, PortfolioItem } from "@/lib/portfolio";

type CategoryScrollerProps = {
  category: Category;
  items: PortfolioItem[];
  direction: "up" | "down";
};

const SCROLL_SPEED_PX_PER_SECOND = 45;
const HOVER_SLOWDOWN = 0.18;
const RESUME_TWEEN_SECONDS = 0.45;

export function CategoryScroller({ category, items, direction }: CategoryScrollerProps) {
  const reduceMotion = useReducedMotion();
  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const repeatedItems = useMemo(() => [...items, ...items, ...items], [items]);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const segmentHeightRef = useRef(0);
  const initialOffset = useMemo(() => (direction === "up" ? 0 : 0), [direction]);
  const offsetRef = useRef(initialOffset);
  const y = useMotionValue(initialOffset);
  const speedScale = useMotionValue(1);
  const speedScaleTarget = useRef(1);
  const lastFrame = useRef<number | null>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const total = track.scrollHeight;
      segmentHeightRef.current = total / 3;
      const segment = segmentHeightRef.current;
      if (segment > 0) {
        offsetRef.current = direction === "up" ? 0 : -segment;
        y.set(offsetRef.current);
      }
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(track);

    const imagesObserver = new MutationObserver(measure);
    imagesObserver.observe(track, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      imagesObserver.disconnect();
    };
  }, [direction, y, repeatedItems.length]);

  useEffect(() => {
    speedScaleTarget.current = reduceMotion ? 0 : isHovering ? HOVER_SLOWDOWN : 1;
  }, [isHovering, reduceMotion]);

  useAnimationFrame((time) => {
    if (reduceMotion) return;
    const segment = segmentHeightRef.current;
    if (segment <= 0) return;

    const last = lastFrame.current;
    lastFrame.current = time;
    if (last === null) return;

    const deltaSeconds = Math.min((time - last) / 1000, 0.1);

    const current = speedScale.get();
    const target = speedScaleTarget.current;
    if (Math.abs(current - target) > 0.001) {
      animate(speedScale, target, {
        duration: RESUME_TWEEN_SECONDS,
        ease: "easeOut",
      });
    }
    const effectiveScale = current;
    if (effectiveScale <= 0) return;

    const delta = SCROLL_SPEED_PX_PER_SECOND * effectiveScale * deltaSeconds;
    const sign = direction === "up" ? -1 : 1;
    let nextOffset = offsetRef.current + sign * delta;

    if (direction === "up") {
      if (-nextOffset >= segment) {
        nextOffset += segment;
      }
    } else {
      if (nextOffset >= 0) {
        nextOffset -= segment;
      }
    }

    offsetRef.current = nextOffset;
    y.set(nextOffset);
  });

  return (
    <section className="min-w-0 md:flex md:h-full md:min-h-0 md:flex-col">
      {/* Title stays fixed height */}
      <Link
      href={`/${category}`}
      className="group mb-2 flex shrink-0 items-center justify-center gap-1.5 text-center font-display text-[12px] font-normal leading-none tracking-normal text-[var(--page-fg)] transition hover:-translate-y-0.5 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)] sm:mb-4 sm:gap-2 sm:text-[24px]"
    >
            <span>{categoryLabels[category]}</span>
        <svg
          aria-hidden="true"
          className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:h-5 sm:w-5"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 15L15 5M15 5H8M15 5v7" />
        </svg>
      </Link>

      {/* This now takes the remaining height instead of a fixed vh */}
      <div
        className="
                h-[260px]
                overflow-hidden
                border-x-[5px]
                border-[var(--page-fg)]
                bg-[var(--page-bg-solid)]

                md:min-h-0
                md:flex-1
                md:h-auto

                sm:border-x-[7px]
                "
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <motion.div
          ref={trackRef}
          className="space-y-[3px] bg-[var(--page-fg)] will-change-transform sm:space-y-[7px]"
          style={{ y }}
        >
          {repeatedItems.map((item, index) => (
            <CategoryCard key={`${item.src}-${index}`} item={item} onOpen={setActiveItem} />
          ))}
        </motion.div>
      </div>

      <Lightbox item={activeItem} onClose={() => setActiveItem(null)} />
    </section>
  );
}