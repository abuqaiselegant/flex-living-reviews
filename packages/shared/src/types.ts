/**
 * Hostaway API Raw Response Types
 */

export interface HostawayRawResponse {
  status: string;
  result: HostawayRawReview[];
}

export interface HostawayRawReview {
  id: number;
  type: string;
  status: string;
  rating: number | null;
  publicReview: string;
  reviewCategory: HostawayRawCategory[];
  submittedAt: string;
  guestName: string;
  listingName: string;
}

export interface HostawayRawCategory {
  category: string;
  rating: number;
}

/**
 * Normalized Review Types
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

/**
 * KPI Types
 */

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

/**
 * API Response Types
 */

// GET /reviews/hostaway - Fetch and normalize reviews from Hostaway
export interface FetchReviewsResponse {
  success: boolean;
  message: string;
  data: {
    normalized: NormalizedReview[];
    raw: HostawayRawReview[];
  };
}

// POST /reviews/approve - Approve review and store in DynamoDB
export interface ApproveReviewRequest {
  reviewId: number;
  listingId: string;
}

export interface ApproveReviewResponse {
  success: boolean;
  message: string;
  data?: {
    reviewId: number;
    listingId: string;
    approvedAt: string;
  };
}

// GET /public/reviews - Public endpoint for approved reviews
export interface PublicReviewsResponse {
  success: boolean;
  data: NormalizedReview[];
}

// GET /dashboard/listings - Dashboard endpoint with KPIs
export interface DashboardListingsResponse {
  success: boolean;
  data: ListingGroup[];
}
