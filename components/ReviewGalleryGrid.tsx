'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BodyLock } from '@/components/BodyLock';
import { Lightbox } from '@/components/Lightbox';
import {
  reviewTypes,
  type ReviewType,
  reviewPathForType,
} from '@/lib/review-types';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import type { PortfolioItem } from '@/lib/portfolio';

type ReviewGalleryGridProps = {
  items: PortfolioItem[];
  reviewType?: ReviewType;
};

export function ReviewGalleryGrid({ items, reviewType }: ReviewGalleryGridProps) {
  const router = useRouter();

  const years = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.year))).sort((a, b) =>
        b.localeCompare(a),
      ),
    [items],
  );

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    if (selectedYear === null && years.length > 0) {
      setSelectedYear(years[0]);
    }
  }, [selectedYear, years]);

  const typeItems = useMemo(
    () => (reviewType ? items.filter((item) => item.reviewType === reviewType) : items),
    [items, reviewType],
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const typeMatch = reviewType ? item.reviewType === reviewType : true;
      const yearMatch =
        selectedYear === null
          ? true
          : item.year === selectedYear;
      return typeMatch && yearMatch;
    });
  }, [items, reviewType, selectedYear]);

  const handleTypeClick = (type: ReviewType) => {
    router.push(reviewPathForType(type));
  };

  const goToAll = () => {
    router.push('/reviews');
  };

  const currentYearIndex = selectedYear ? years.indexOf(selectedYear) : -1;

  const previousYear = () => {
    if (selectedYear === null || years.length === 0) {
      setSelectedYear(years[0] ?? null);
    } else if (currentYearIndex < years.length - 1) {
      setSelectedYear(years[currentYearIndex + 1]);
    }
  };

  const nextYear = () => {
    if (selectedYear === null || years.length === 0) {
      setSelectedYear(years[0] ?? null);
    } else if (currentYearIndex > 0) {
      setSelectedYear(years[currentYearIndex - 1]);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--page-fg)] transition-colors duration-300">
      <BodyLock locked={false} />
      <ThemeToggle />
      <section className="mx-auto min-h-screen max-w-[1358px] px-5 pb-20 pt-14 sm:px-8 lg:px-16 lg:pt-[86px]">
        <nav className="relative h-[58px]">
          <Link
            href="/"
            className="absolute left-0 top-1.5 grid h-7 w-7 place-items-center rounded-full transition hover:-translate-x-1 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)] sm:top-2 sm:h-9 sm:w-9"
            aria-label="Back to homepage"
          >
            <span
              className="h-full w-full bg-[var(--page-fg)] [mask:url('/assets/figma-back.svg')_center/contain_no-repeat]"
              aria-hidden="true"
            />
          </Link>

          {/* Category tabs */}
          <div className="absolute left-1/2 top-0 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2">
            <button
              onClick={goToAll}
              className={`
                px-3 py-1.5 text-xs font-medium transition sm:px-5 sm:py-2 sm:text-sm
                ${
                  !reviewType
                    ? 'bg-[var(--panel-bg)] text-[var(--panel-fg)] shadow-sm'
                    : 'border border-[var(--frame)]/40 bg-transparent text-[var(--page-fg)] hover:bg-[var(--panel-bg)]/10'
                }
              `}
            >
              All
            </button>
            {reviewTypes.map((type) => {
              const isActive = reviewType === type;

              return (
                <button
                  key={type}
                  onClick={() => handleTypeClick(type)}
                  className={`
                    px-3 py-1.5 text-xs font-medium transition sm:px-5 sm:py-2 sm:text-sm
                    ${
                      isActive
                        ? 'bg-[var(--panel-bg)] text-[var(--panel-fg)] shadow-sm'
                        : 'border border-[var(--frame)]/40 bg-transparent text-[var(--page-fg)] hover:bg-[var(--panel-bg)]/10'
                    }
                  `}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Year selector */}
        <header className="mt-6 text-center">
          {years.length > 1 ? (
            <div className="mb-5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={previousYear}
                disabled={years.length === 0 || (selectedYear !== null && currentYearIndex === years.length - 1)}
                className="grid h-10 w-10 place-items-center border border-[var(--frame)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                aria-label="Previous year"
              >
                <FaChevronLeft className="h-4 w-4" />
              </button>

              <div className="min-w-[88px] border border-[var(--frame)] bg-[var(--panel-bg)] px-5 py-1 font-display text-xl font-normal tracking-normal text-[var(--panel-fg)]">
                {selectedYear ?? '—'}
              </div>

              <button
                type="button"
                onClick={nextYear}
                disabled={years.length === 0 || (selectedYear !== null && currentYearIndex === 0)}
                className="grid h-10 w-10 place-items-center border border-[var(--frame)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
                aria-label="Next year"
              >
                <FaChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </header>

        {/* Gallery grid */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-2xl font-normal tracking-normal text-[var(--page-fg)] sm:text-3xl">
              {typeItems.length === 0 && reviewType
                ? `No ${reviewType} reviews uploaded yet.`
                : 'No reviews found for this filter.'}
            </p>
            <p className="mt-3 font-sans text-xs uppercase tracking-normal text-[var(--page-fg)]/50">
              {typeItems.length === 0 && reviewType
                ? 'Upload reviews from the admin panel to see it here.'
                : 'Try a different year or switch between All, Movies, and Books.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <ReviewCard key={item.src} item={item} onOpen={() => setActiveItem(item)} />
            ))}
          </div>
        )}
      </section>

      <Lightbox
        item={activeItem}
        onClose={() => setActiveItem(null)}
      />
    </main>
  );
}

function ReviewCard({ item, onOpen }: { item: PortfolioItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
    >
      <span className="relative block aspect-[4/5] w-full overflow-hidden">
        <Image
          src={item.src}
          alt={item.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/50 group-hover:opacity-100">
          <span className="font-display text-2xl font-normal tracking-normal text-white">Open</span>
        </span>
      </span>
    </button>
  );
}
