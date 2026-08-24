import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReviewGalleryGrid } from '@/components/ReviewGalleryGrid';
import {
  reviewTypeFromSlug,
  reviewTypeSlugs,
  type ReviewTypeSlug,
} from '@/lib/review-types';
import { getItemsByCategory } from '@/lib/portfolio';

export const dynamic = 'force-dynamic';

type ReviewTypePageProps = {
  params: Promise<{
    reviewType: string;
  }>;
};

export function generateStaticParams() {
  return reviewTypeSlugs.map((reviewType) => ({
    reviewType,
  }));
}

export async function generateMetadata({
  params,
}: ReviewTypePageProps): Promise<Metadata> {
  const { reviewType: slug } = await params;

  const reviewType = reviewTypeFromSlug(slug);

  if (!reviewType) {
    return {};
  }

  return {
    title: `${reviewType} | Reviews`,
    description: `${reviewType} reviews by Lyka Mimics.`,
    openGraph: {
      title: `${reviewType} | Reviews`,
      description: `${reviewType} reviews by Lyka Mimics.`,
      type: 'website',
    },
  };
}

export default async function ReviewTypePage({
  params,
}: ReviewTypePageProps) {
  const { reviewType: slug } = await params;

  const reviewType = reviewTypeFromSlug(slug);

  if (!reviewType) {
    notFound();
  }

  const items = await getItemsByCategory('reviews');

  return (
    <ReviewGalleryGrid
      items={items}
      reviewType={reviewType}
    />
  );
}
