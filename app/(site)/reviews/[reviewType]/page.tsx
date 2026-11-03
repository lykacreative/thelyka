import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ReviewsSection } from '@/components/site/ReviewsSection';
import {
  reviewTypeFromSlug,
  reviewTypeSlugs,
} from '@/lib/review-types';

export const dynamic = 'force-static';

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
    title: reviewType,
    description: `${reviewType} reviews by Lyka Mimics.`,
    openGraph: {
      title: reviewType,
      description: `${reviewType} reviews by Lyka Mimics.`,
      type: 'website',
      images: ['/opengraph-image'],
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

  // That tab of the Reviews section on its own page.
  return (
    <main id='main'>
      <h1 className='vh'>{reviewType} · Lyka Mimics</h1>
      <span id='top' />
      <ReviewsSection initialType={reviewType} syncPath />
    </main>
  );
}
