'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BodyLock } from '@/components/BodyLock';
import { Lightbox } from '@/components/Lightbox';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { Category, PortfolioItem } from '@/lib/portfolio';
import { categoryLabels } from '@/lib/copy';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

type GalleryGridProps = {
  category: Category;
  items: PortfolioItem[];
};

export function GalleryGrid({ category, items }: GalleryGridProps) {
  const years = useMemo(
    () =>
      Array.from(new Set(items.map((item) => item.year))).sort((a, b) =>
        b.localeCompare(a),
      ),
    [items],
  );
  const [selectedYear, setSelectedYear] = useState(years[0] ?? '');
  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);
  const filteredItems = selectedYear
    ? items.filter((item) => item.year === selectedYear)
    : items;

  const currentYearIndex = years.indexOf(selectedYear);

  const previousYear = () => {
    if (currentYearIndex < years.length - 1) {
      setSelectedYear(years[currentYearIndex + 1]);
    }
  };

  const nextYear = () => {
    if (currentYearIndex > 0) {
      setSelectedYear(years[currentYearIndex - 1]);
    }
  };

  return (
    <main className='min-h-screen bg-[var(--page-bg)] text-[var(--page-fg)] transition-colors duration-300'>
      <BodyLock locked={false} />
      <ThemeToggle />
      <section className='mx-auto min-h-screen max-w-[1358px] px-5 pb-20 pt-14 sm:px-8 lg:px-16 lg:pt-[86px]'>
        <nav className='relative h-[58px]'>
          <Link
            href='/'
            className='absolute left-0 top-1.5 grid h-7 w-7 place-items-center rounded-full transition hover:-translate-x-1 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)] sm:top-2 sm:h-9 sm:w-9'
            aria-label='Back to homepage'
          >
            <span
              className="h-full w-full bg-[var(--page-fg)] [mask:url('/assets/figma-back.svg')_center/contain_no-repeat]"
              aria-hidden='true'
            />
          </Link>
          <h1 className='absolute left-1/2 top-0 -translate-x-1/2 font-display text-[35px] font-normal leading-none tracking-normal '>
            {categoryLabels[category]}
          </h1>
        </nav>

        <header className='text-center'>
          {years.length > 1 ? (
            <div className='mb-5 flex items-center justify-center gap-3'>
              <button
                type='button'
                onClick={previousYear}
                disabled={currentYearIndex === years.length - 1}
                className='grid h-10 w-10 place-items-center border border-[var(--frame)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]'
                aria-label='Previous year'
              >
                <FaChevronLeft className='h-4 w-4' />
              </button>

              <div className='min-w-[88px] border border-[var(--frame)] bg-[var(--panel-bg)] px-5 py-1 font-display text-xl font-normal tracking-normal text-[var(--panel-fg)]'>
                {selectedYear}
              </div>

              <button
                type='button'
                onClick={nextYear}
                disabled={currentYearIndex === 0}
                className='grid h-10 w-10 place-items-center border border-[var(--frame)] transition hover:bg-[var(--panel-bg)] hover:text-[var(--panel-fg)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[var(--page-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]'
                aria-label='Next year'
              >
                <FaChevronRight className='h-4 w-4' />
              </button>
            </div>
          ) : null}
        </header>

        {filteredItems.length > 0 ? (
          <div className='grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3'>
            {filteredItems.map((item) => (
              <button
                key={item.src}
                type='button'
                onClick={() => setActiveItem(item)}
                className='group block text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)] shadow-md'
              >
                <span className='relative block aspect-square overflow-hidden transition duration-300 group-hover:scale-[0.992] group-hover:opacity-95'>
                  <Image
                    src={item.src}
                    alt={`${item.title} by lyka mimics`}
                    fill
                    sizes='(max-width: 640px) 92vw, (max-width: 1024px) 48vw, 32vw'
                    className='object-cover'
                  />
                  <span className='absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/50 group-hover:opacity-100'>
                    <span className='font-display text-2xl font-normal tracking-normal text-white'>Open</span>
                  </span>
                </span>
                <span className='sr-only'>
                  <span className='block font-display text-2xl font-normal leading-none tracking-normal'>
                    {item.title}
                  </span>
                  <span className='mt-1 block font-display text-base font-normal tracking-normal'>
                    {item.date || item.year}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className='py-24 text-center'>
            <p className='font-display text-2xl font-normal tracking-normal text-[var(--page-fg)] sm:text-3xl'>
              No {category} uploaded yet.
            </p>
            <p className='mt-3 font-sans text-xs uppercase tracking-normal text-[var(--page-fg)]/50'>
              Upload artwork from the admin panel to see it here.
            </p>
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