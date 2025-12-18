/**
 * Lambda handler for fetching public listings with approved review counts
 * GET /v1/public/listings
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, serverError } from '../http/response';
import { queryListingKPIs } from '../db/reviewsRepo';
import { getApprovalsForListing } from '../repos/approvalsRepo';

interface PublicListing {
  listingId: string;
  listingName: string;
  approvedReviewCount: number;
  avgRating: number | null;
}

/**
 * Main Lambda handler for GET /v1/public/listings
 * Returns listings that have at least one approved review
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Starting public listings fetch', { path: event.path });

  try {
    // Step 1: Get all listings with their reviews
    let listingGroups;
    
    try {
      listingGroups = await queryListingKPIs();
      console.log('Listing groups retrieved', { count: listingGroups.length });
    } catch (error) {
      console.error('Failed to query listing KPIs', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return serverError('Failed to fetch listing data', {
        detail: error instanceof Error ? error.message : 'Database operation failed',
      });
    }

    // Step 2: For each listing, get approval stats and filter
    const publicListings: PublicListing[] = [];

    for (const group of listingGroups) {
      try {
        // Get approvals for this listing
        const approvals = await getApprovalsForListing(group.listingId);
        
        // Count approved reviews
        const approvedReviewIds = Object.entries(approvals)
          .filter(([_, isApproved]) => isApproved === true)
          .map(([reviewId]) => reviewId);

        const approvedReviewCount = approvedReviewIds.length;

        // Only include listings with at least one approved review
        if (approvedReviewCount > 0) {
          // Calculate average rating from approved reviews only
          const approvedReviews = group.reviews.filter(r => 
            approvedReviewIds.includes(r.reviewId)
          );

          const ratingsSum = approvedReviews
            .filter(r => r.overallRating !== null)
            .reduce((sum, r) => sum + (r.overallRating || 0), 0);

          const ratingsCount = approvedReviews.filter(r => r.overallRating !== null).length;

          const avgRating = ratingsCount > 0 
            ? Math.round((ratingsSum / ratingsCount) * 100) / 100
            : null;

          publicListings.push({
            listingId: group.listingId,
            listingName: group.listingName,
            approvedReviewCount,
            avgRating,
          });
        }
      } catch (error) {
        console.warn('Failed to fetch approval stats for listing', {
          listingId: group.listingId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Skip this listing if we can't get approval stats
        continue;
      }
    }

    // Step 3: Sort by average rating (highest to lowest), then by name
    publicListings.sort((a, b) => {
      // Handle null ratings (put them at the end)
      if (a.avgRating === null && b.avgRating === null) {
        return a.listingName.localeCompare(b.listingName);
      }
      if (a.avgRating === null) return 1;
      if (b.avgRating === null) return -1;
      
      // Sort by rating descending
      const ratingDiff = b.avgRating - a.avgRating;
      if (ratingDiff !== 0) return ratingDiff;
      
      // If ratings are equal, sort by name
      return a.listingName.localeCompare(b.listingName);
    });

    console.log('Public listings fetch completed', {
      totalListings: listingGroups.length,
      publicListings: publicListings.length,
    });

    // Step 4: Return response
    return ok({
      listings: publicListings,
      meta: {
        total: publicListings.length,
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
