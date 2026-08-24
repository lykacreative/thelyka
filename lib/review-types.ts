export const reviewTypes = ["Movies", "Books"] as const;

export type ReviewType = (typeof reviewTypes)[number];

export const reviewTypeSlugs = ["movies", "books"] as const;

export type ReviewTypeSlug = (typeof reviewTypeSlugs)[number];

export const defaultReviewType: ReviewType = "Movies";

export const defaultReviewTypeSlug: ReviewTypeSlug = "movies";

export const reviewTypeBySlug: Record<ReviewTypeSlug, ReviewType> = {
  movies: "Movies",
  books: "Books",
};

export const reviewSlugByType: Record<ReviewType, ReviewTypeSlug> = {
  Movies: "movies",
  Books: "books",
};

export function isReviewType(value: string): value is ReviewType {
  return reviewTypes.includes(value as ReviewType);
}

export function isReviewTypeSlug(value: string): value is ReviewTypeSlug {
  return reviewTypeSlugs.includes(value as ReviewTypeSlug);
}

export function reviewTypeFromSlug(slug: string): ReviewType | null {
  return isReviewTypeSlug(slug) ? reviewTypeBySlug[slug] : null;
}

export function reviewPathForType(reviewType: ReviewType) {
  return `/reviews/${reviewSlugByType[reviewType]}`;
}
