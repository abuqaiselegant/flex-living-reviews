/**
 * Lambda handler for fetching dashboard listings with KPIs
 * GET /v1/dashboard/listings
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, badRequest, serverError } from '../http/response';
import { optionalString } from '../http/validate';
import { queryListingKPIs } from '../db/reviewsRepo';
import { getApprovalsForListing } from '../repos/approvalsRepo';
import { ListingGroup, NormalizedReview } from '../types';

interface DashboardListing {
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
 * Main Lambda handler for GET /v1/dashboard/listings
 * Returns listing-level KPIs with optional filtering and approval statistics
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Starting dashboard listings fetch', {
    path: event.path,
    queryParams: event.queryStringParameters,
  });

  try {
    // Step 1: Parse query parameters
    const queryParams = event.queryStringParameters || {};
    
    let fromDate: string | undefined;
    let toDate: string | undefined;
    let minRating: number | undefined;
    let categoryKey: string | undefined;
    let sort: string = 'name'; // Default sort
    let limit: number = 50; // Default limit
    let includeApprovals: boolean = false;

    try {
      fromDate = optionalString(queryParams.from, 'from');
      toDate = optionalString(queryParams.to, 'to');
      categoryKey = optionalString(queryParams.categoryKey, 'categoryKey');
      
      if (queryParams.minRating) {
        minRating = parseFloat(queryParams.minRating);
        if (isNaN(minRating)) {
          return badRequest('minRating must be a valid number');
        }
      }

      if (queryParams.sort) {
        const validSorts = ['name', 'rating', 'reviewCount'];
        if (!validSorts.includes(queryParams.sort)) {
          return badRequest(`sort must be one of: ${validSorts.join(', ')}`);
        }
        sort = queryParams.sort;
      }

      if (queryParams.limit) {
        limit = parseInt(queryParams.limit, 10);
        if (isNaN(limit) || limit < 1 || limit > 100) {
          return badRequest('limit must be between 1 and 100');
        }
      }

      if (queryParams.includeApprovals === 'true') {
        includeApprovals = true;
      }
    } catch (error) {
      console.error('Query parameter validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return badRequest(
        error instanceof Error ? error.message : 'Invalid query parameters'
      );
    }

    console.log('Query parameters parsed', {
      fromDate,
      toDate,
      minRating,
      categoryKey,
      sort,
      limit,
      includeApprovals,
    });

    // Step 2: Query PostgreSQL for listing KPIs
    let listingGroups: ListingGroup[];

    try {
      listingGroups = await queryListingKPIs(undefined, fromDate, toDate);
      console.log('Listing groups retrieved', { count: listingGroups.length });
    } catch (error) {
      console.error('Failed to query listing KPIs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return serverError('Failed to fetch listing data', {
        detail: error instanceof Error ? error.message : 'Database operation failed',
      });
    }

    // Step 3: Apply filters and enrich data
    const dashboardListings: DashboardListing[] = [];

    for (const group of listingGroups) {
      // Filter by minRating if specified
      if (minRating !== undefined && group.kpis.avgOverallRating !== null) {
        if (group.kpis.avgOverallRating < minRating) {
          continue;
        }
      }

      // Filter by categoryKey if specified
      if (categoryKey !== undefined) {
        if (!group.kpis.avgByCategory[categoryKey]) {
          continue;
        }
      }

      // Find worst category (lowest average rating)
      let worstCategory: { key: string; avgRating: number } | null = null;
      for (const [key, avgRating] of Object.entries(group.kpis.avgByCategory)) {
        if (!worstCategory || avgRating < worstCategory.avgRating) {
          worstCategory = { key, avgRating };
        }
      }

      // Get all reviews sorted by date (most recent first)
      // Note: For manager dashboard, we return ALL reviews so they can be managed
      const latestReviews = group.reviews
        .sort((a, b) => new Date(b.submittedAtISO).getTime() - new Date(a.submittedAtISO).getTime());

      // Build dashboard listing
      const dashboardListing: DashboardListing = {
        listingId: group.listingId,
        listingName: group.listingName,
        kpis: {
          reviewCount: group.kpis.reviewCount,
          avgOverallRating: group.kpis.avgOverallRating,
          avgByCategory: group.kpis.avgByCategory,
          worstCategory,
        },
        latestReviews,
      };

      // Step 4: Optionally fetch approval statistics from DynamoDB
      if (includeApprovals) {
        try {
          const approvals = await getApprovalsForListing(group.listingId);
          const approvedCount = Object.values(approvals).filter(Boolean).length;
          const totalReviews = group.reviews.length;
          
          dashboardListing.approvalStats = {
            totalReviews,
            approvedCount,
            pendingCount: totalReviews - approvedCount,
          };
        } catch (error) {
          console.warn('Failed to fetch approval stats for listing', {
            listingId: group.listingId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          // Continue without approval stats if DynamoDB fails
        }
      }

      dashboardListings.push(dashboardListing);
    }

    // Step 5: Sort results
    switch (sort) {
      case 'rating':
        dashboardListings.sort((a, b) => {
          const ratingA = a.kpis.avgOverallRating ?? 0;
          const ratingB = b.kpis.avgOverallRating ?? 0;
          return ratingB - ratingA; // Descending
        });
        break;
      case 'reviewCount':
        dashboardListings.sort((a, b) => b.kpis.reviewCount - a.kpis.reviewCount); // Descending
        break;
      case 'name':
      default:
        dashboardListings.sort((a, b) => a.listingName.localeCompare(b.listingName)); // Ascending
        break;
    }

    // Step 6: Apply limit
    const limitedListings = dashboardListings.slice(0, limit);
    const hasMore = dashboardListings.length > limit;

    console.log('Dashboard listings fetch completed', {
      totalListings: listingGroups.length,
      filteredListings: dashboardListings.length,
      returnedListings: limitedListings.length,
      hasMore,
    });

    // Step 7: Return response
    return ok({
      listings: limitedListings,
      meta: {
        total: dashboardListings.length,
        returned: limitedListings.length,
        hasMore,
        filters: {
          from: fromDate,
          to: toDate,
          minRating,
          categoryKey,
        },
        sort,
      },
    });
  } catch (error) {
    console.error('Unexpected error in handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return serverError('An unexpected error occurred', {
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
