import type { Metadata } from 'next';
import { ArtGalleryGrid } from '@/components/ArtGalleryGrid';
import { getItemsByCategory } from '@/lib/portfolio';

export const metadata: Metadata = {
  title: 'Art',
  description: 'A collection of sketches, photography, and digital art by Lyka Mimics.',
};

export default async function ArtsPage() {
  const items = await getItemsByCategory('arts');

  return (
    <ArtGalleryGrid
      items={items}
    />
  );
}