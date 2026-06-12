"use client";

import Image from "next/image";
import Link from "next/link";
import type { PortfolioItem } from "@/lib/portfolio";

type CategoryCardProps = {
  item: PortfolioItem;
  variant?: "designLarge" | "designSmall" | "reviewsTop" | "reviewsBottom" | "artTop" | "artLarge";
  onOpen?: (item: PortfolioItem) => void;
};

export function CategoryCard({ item, onOpen }: CategoryCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen?.(item)}
      className="group block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]"
      aria-label={`Open ${item.title}`}
    >
      <span className="relative block aspect-[4/3] w-full overflow-hidden bg-[var(--page-fg)] transition duration-300 group-hover:opacity-90">
        <Image
          src={item.src}
          alt={`${item.title} by lyka mimics`}
          fill
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 31vw, 33vw"
          className="object-cover object-center"
        />
        <span className="absolute inset-x-0 bottom-0 bg-figmaBlack/70 px-3 py-2 text-center font-display text-sm font-normal tracking-normal text-figmaCream opacity-0 transition group-hover:opacity-100 sm:text-base">
          {item.title}
        </span>
      </span>
    </button>
  );
}

export function CategoryLinkCard({ item }: { item: PortfolioItem }) {
  return (
    <Link href={`/${item.category}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--frame)]">
      <CategoryCard item={item} />
    </Link>
  );
}
