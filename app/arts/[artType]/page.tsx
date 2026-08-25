import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArtGalleryGrid } from '@/components/ArtGalleryGrid';
import {
  artTypeFromSlug,
  artTypeSlugs,
  type ArtTypeSlug,
} from '@/lib/art-types';
import { getItemsByCategory } from '@/lib/portfolio';

export const dynamic = 'force-dynamic';

type ArtTypePageProps = {
  params: Promise<{
    artType: string;
  }>;
};

export function generateStaticParams() {
  return artTypeSlugs.map((artType) => ({
    artType,
  }));
}

export async function generateMetadata({
  params,
}: ArtTypePageProps): Promise<Metadata> {
  const { artType: slug } = await params;

  const artType = artTypeFromSlug(slug);

  if (!artType) {
    return {};
  }

  return {
    title: artType,
    description: `${artType} by Lyka Mimics.`,
    openGraph: {
      title: artType,
      description: `${artType} by Lyka Mimics.`,
      type: 'website',
    },
  };
}

export default async function ArtTypePage({
  params,
}: ArtTypePageProps) {
  const { artType: slug } = await params;

  const artType = artTypeFromSlug(slug);

  if (!artType) {
    notFound();
  }

  const items = await getItemsByCategory('arts');

  return (
    <ArtGalleryGrid
      items={items}
      artType={artType}
    />
  );
}