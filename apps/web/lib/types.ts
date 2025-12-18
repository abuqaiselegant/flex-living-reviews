/**
 * Core types for Flex Living Reviews
 */

export interface NormalizedCategory {
  key: string;
  label: string;
  rating: number;
}

export interface NormalizedReview {
  reviewId: string;
  source: 'hostaway';
  listingId: string;
  listingName: string;
  type: string;
  status: string;
  submittedAtISO: string;
  guestName: string;
  publicReview: string;
  overallRating: number | null;
  categories: NormalizedCategory[];
}

export interface ListingKPIs {
  reviewCount: number;
  avgOverallRating: number | null;
  avgByCategory: Record<string, number>;
}

export interface ListingGroup {
  listingId: string;
  listingName: string;
  kpis: ListingKPIs;
  reviews: NormalizedReview[];
}
