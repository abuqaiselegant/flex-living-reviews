/**
 * API client for Flex Living Reviews
 * Frontend API functions with typed responses
 */

import {
  NormalizedReview,
  ListingGroup,
} from '../../../packages/shared/src/types';

/**
 * Get the API base URL from environment variables
 * Use relative paths in production (Vercel) or localhost for local development
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

/**
 * API Error class for handling API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.statusText}`;
      let errorDetails;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorDetails = errorData.details;
      } catch {
        // If error response is not JSON, use status text
      }

      throw new ApiError(errorMessage, response.status, errorDetails);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

/**
 * Response type for fetchHostawayGrouped
 */
export interface HostawayGroupedResponse {
  source: string;
  generatedAt: string;
  totalReviews: number;
  listings: ListingGroup[];
}

/**
 * Fetch and normalize Hostaway reviews, grouped by listing
 * 
 * @returns Grouped reviews with KPIs
 */
export async function fetchHostawayGrouped(): Promise<HostawayGroupedResponse> {
  return apiFetch<HostawayGroupedResponse>('/v1/reviews/hostaway');
}

/**
 * Dashboard listings query parameters
 */
export interface DashboardListingsParams {
  from?: string;
  to?: string;
  minRating?: number;
  categoryKey?: string;
  sort?: 'name' | 'rating' | 'reviewCount';
  limit?: number;
  includeApprovals?: boolean;
}

/**
 * Dashboard listing with KPIs
 */
export interface DashboardListing {
  listingId: string;
  listingName: string;
  kpis: {
    reviewCount: number;
    avgOverallRating: number | null;
    avgByCategory: Record<string, number>;
    worstCategory?: {
      key: string;
      avgRating: number;
    } | null;
  };
  approvalStats?: {
    totalReviews: number;
    approvedCount: number;
    pendingCount: number;
  };
  latestReviews: NormalizedReview[];
}

/**
 * Response type for fetchDashboardListings
 */
export interface DashboardListingsResponse {
  listings: DashboardListing[];
  meta: {
    total: number;
    returned: number;
    hasMore: boolean;
    filters: {
      from?: string;
      to?: string;
      minRating?: number;
      categoryKey?: string;
    };
    sort: string;
  };
}

/**
 * Fetch dashboard listings with KPIs and optional filters
 * 
 * @param params - Query parameters for filtering and sorting
 * @returns Dashboard listings with KPIs
 */
export async function fetchDashboardListings(
  params?: DashboardListingsParams
): Promise<DashboardListingsResponse> {
  const queryParams = new URLSearchParams();

  if (params?.from) queryParams.append('from', params.from);
  if (params?.to) queryParams.append('to', params.to);
  if (params?.minRating !== undefined) queryParams.append('minRating', params.minRating.toString());
  if (params?.categoryKey) queryParams.append('categoryKey', params.categoryKey);
  if (params?.sort) queryParams.append('sort', params.sort);
  if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
  if (params?.includeApprovals) queryParams.append('includeApprovals', 'true');

  const queryString = queryParams.toString();
  const endpoint = `/v1/dashboard/listings${queryString ? `?${queryString}` : ''}`;

  return apiFetch<DashboardListingsResponse>(endpoint);
}

/**
 * Response type for approveReview
 */
export interface ApproveReviewResponse {
  ok: boolean;
  reviewId: string;
  listingId: string;
  isApproved: boolean;
  approvedAt: string;
}

/**
 * Approve or reject a review
 * 
 * @param reviewId - Review ID to approve/reject
 * @param listingId - Listing ID the review belongs to
 * @param isApproved - Whether to approve (true) or reject (false)
 * @returns Approval confirmation
 */
export async function approveReview(
  reviewId: string,
  listingId: string,
  isApproved: boolean
): Promise<ApproveReviewResponse> {
  return apiFetch<ApproveReviewResponse>(`/v1/reviews/${reviewId}/approve`, {
    method: 'POST',
    body: JSON.stringify({
      listingId,
      isApproved,
    }),
  });
}

/**
 * Response type for fetchPublicReviews
 */
export interface PublicReviewsResponse {
  listingId: string;
  reviews: NormalizedReview[];
}

/**
 * Public listing with approved review count
 */
export interface PublicListing {
  listingId: string;
  listingName: string;
  approvedReviewCount: number;
  avgRating: number | null;
}

/**
 * Response type for fetchPublicListings
 */
export interface PublicListingsResponse {
  listings: PublicListing[];
  meta: {
    total: number;
  };
}

/**
 * Fetch all public listings with approved review counts
 * 
 * @returns Public listings with approved reviews only
 */
export async function fetchPublicListings(): Promise<PublicListingsResponse> {
  return apiFetch<PublicListingsResponse>('/v1/public/listings');
}

/**
 * Fetch approved public reviews for a listing
 * 
 * @param listingId - Listing ID to fetch reviews for
 * @returns Public approved reviews
 */
export async function fetchPublicReviews(
  listingId: string
): Promise<PublicReviewsResponse> {
  return apiFetch<PublicReviewsResponse>(`/v1/public/listings/${listingId}/reviews`);
}
