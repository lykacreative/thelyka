import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArtSection } from '@/components/site/ArtSection';
import {
  artTypeFromSlug,
  artTypeSlugs,
} from '@/lib/art-types';

export const dynamic = 'force-static';

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
      images: ['/opengraph-image'],
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

  // That room of the Art section on its own page.
  return (
    <main id='main'>
      <h1 className='vh'>{artType} · Lyka Mimics</h1>
      <span id='top' />
      <ArtSection initialRoom={artType} syncPath />
    </main>
  );
}
