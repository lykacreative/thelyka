'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BodyLock } from '@/components/BodyLock';
import { Lightbox } from '@/components/Lightbox';
import {
  artTypes,
  type ArtType,
  artPathForType,
} from '@/lib/art-types';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';
import type { PortfolioItem } from '@/lib/portfolio';

type ArtGalleryGridProps = {
  items: PortfolioItem[];
  artType?: ArtType;      // when on /arts/[type]
};

export function ArtGalleryGrid({ items, artType }: ArtGalleryGridProps) {
  const router = useRouter();

  // Derive years from the actual items so new years (2026, 2027, 2028...)
  // appear automatically and the newest year is shown by default.
  const years = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.year))).sort((a, b) =>
        b.localeCompare(a),
      ),
    [items],
  );

  // Hydration-safe: start with null, then set the newest year after mount.
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    if (selectedYear === null && years.length > 0) {
      setSelectedYear(years[0]);
    }
  }, [selectedYear, years]);

  // Items matching the current art-type filter (ignoring year) so we can
  // show a friendly "No Sketches uploaded yet" message on the filter pages.
  const typeItems = useMemo(
    () => (artType ? items.filter((item) => item.artType === artType) : items),
    [items, artType],
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const typeMatch = artType ? item.artType === artType : true;
      const yearMatch =
        selectedYear === null
          ? true
          : item.year === selectedYear;
      return typeMatch && yearMatch;
    });
  }, [items, artType, selectedYear]);

  const handleTypeClick = (type: ArtType) => {
    router.push(artPathForType(type));
  };

  const goToAll = () => {
    router.push('/arts');
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
        <nav className="relative pt-8 pb-2 sm:pt-10 sm:pb-3">
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

          {/* Category tabs - moved up to where ART text was */}
          <div className="flex flex-wrap items-center justify-center gap-2 pl-10 sm:pl-12">
            <button
              onClick={goToAll}
              className={`
                px-3 py-1.5 text-xs font-medium transition sm:px-5 sm:py-2 sm:text-sm
                ${
                  !artType
                    ? 'border border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]'
                    : 'border border-[var(--frame)] bg-transparent text-[var(--page-fg)] hover:bg-[var(--panel-bg)]/10'
                }
              `}
            >
              All
            </button>
            {artTypes.map((type) => {
              const isActive = artType === type;

              return (
                <button
                  key={type}
                  onClick={() => handleTypeClick(type)}
                  className={`
                    px-3 py-1.5 text-xs font-medium transition sm:px-5 sm:py-2 sm:text-sm
                    ${
                      isActive
                        ? 'border border-[var(--frame)] bg-[var(--panel-bg)] text-[var(--panel-fg)]'
                        : 'border border-[var(--frame)] bg-transparent text-[var(--page-fg)] hover:bg-[var(--panel-bg)]/10'
                    }
                  `}
                >
                  {type}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Year selector - moved up */}
        <header className="text-center">
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
        </header>

        {/* Gallery grid */}
        {filtered.length === 0 ? (
          <div className="py-24 text-center">
            <p className="font-display text-2xl font-normal tracking-normal text-[var(--page-fg)] sm:text-3xl">
              {typeItems.length === 0 && artType
                ? `No ${artType} uploaded yet.`
                : 'No pieces found for this filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <ArtCard key={item.src} item={item} onOpen={() => setActiveItem(item)} />
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

function ArtCard({ item, onOpen }: { item: PortfolioItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onContextMenu={(event) => event.preventDefault()}
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