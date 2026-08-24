export const artTypes = ["Sketches", "Photography", "Digital Art"] as const;

export type ArtType = (typeof artTypes)[number];

export const artTypeSlugs = ["sketches", "photography", "digitalart"] as const;

export type ArtTypeSlug = (typeof artTypeSlugs)[number];

export const defaultArtType: ArtType = "Sketches";

export const defaultArtTypeSlug: ArtTypeSlug = "sketches";

export const artTypeBySlug: Record<ArtTypeSlug, ArtType> = {
  sketches: "Sketches",
  photography: "Photography",
  digitalart: "Digital Art",
};

export const artSlugByType: Record<ArtType, ArtTypeSlug> = {
  Sketches: "sketches",
  Photography: "photography",
  "Digital Art": "digitalart",
};

export function isArtType(value: string): value is ArtType {
  return artTypes.includes(value as ArtType);
}

export function isArtTypeSlug(value: string): value is ArtTypeSlug {
  return artTypeSlugs.includes(value as ArtTypeSlug);
}

export function artTypeFromSlug(slug: string): ArtType | null {
  return isArtTypeSlug(slug) ? artTypeBySlug[slug] : null;
}

export function artPathForType(artType: ArtType) {
  return `/arts/${artSlugByType[artType]}`;
}
