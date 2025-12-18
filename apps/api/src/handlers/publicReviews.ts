/**
 * Lambda handler for fetching public approved reviews
 * GET /v1/public/listings/{listingId}/reviews
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, badRequest, serverError } from '../http/response';
import { getApprovedReviewIds } from '../repos/approvalsRepo';
import { getReviewsByIds } from '../db/reviewsRepo';
import { NormalizedReview } from '../types';

/**
 * Main Lambda handler for GET /v1/public/listings/{listingId}/reviews
 * Returns approved reviews for a specific listing, sorted by submission date
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Starting public reviews fetch', { path: event.path });

  try {
    // Step 1: Extract listingId from path parameters
    const listingId = event.pathParameters?.listingId;

    if (!listingId) {
      console.error('Missing listingId in path parameters');
      return badRequest('listingId is required in path');
    }

    // Step 2: Fetch approved review IDs from DynamoDB
    let approvedReviewIds: string[];

    try {
      approvedReviewIds = await getApprovedReviewIds(listingId);
      console.log('Approved review IDs retrieved', {
        listingId,
        count: approvedReviewIds.length,
      });
    } catch (error) {
      console.error('Failed to fetch approved review IDs', {
        listingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return serverError('Failed to fetch approved reviews', {
        detail: error instanceof Error ? error.message : 'DynamoDB operation failed',
      });
    }

    // Step 3: If no approved reviews, return empty array
    if (approvedReviewIds.length === 0) {
      console.log('No approved reviews found', { listingId });
      return ok({
        listingId,
        reviews: [],
      });
    }

    // Step 4: Fetch review details from PostgreSQL
    let reviews: NormalizedReview[];

    try {
      reviews = await getReviewsByIds(approvedReviewIds);
      console.log('Reviews retrieved from database', {
        listingId,
        count: reviews.length,
      });
    } catch (error) {
      console.error('Failed to fetch reviews from database', {
        listingId,
        reviewIds: approvedReviewIds,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return serverError('Failed to fetch review details', {
        detail: error instanceof Error ? error.message : 'Database operation failed',
      });
    }

    // Step 5: Sort by submittedAtISO descending (most recent first)
    reviews.sort((a, b) => {
      return new Date(b.submittedAtISO).getTime() - new Date(a.submittedAtISO).getTime();
    });

    console.log('Public reviews fetch completed', {
      listingId,
      reviewCount: reviews.length,
    });

    // Step 6: Return response
    return ok({
      listingId,
      reviews,
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
