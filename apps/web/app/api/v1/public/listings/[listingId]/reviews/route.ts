/**
 * API Route for fetching approved reviews for a listing
 * GET /api/v1/public/listings/[listingId]/reviews
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// DynamoDB client - ensure fresh connections
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
});

async function getReviewsByListingId(listingId: string) {
  const result = await pool.query(
    `SELECT 
      r.review_id as "reviewId",
      r.listing_id as "listingId",
      r.listing_name as "listingName",
      r.guest_name as "guestName",
      r.overall_rating as "overallRating",
      r.public_review as "reviewText",
      r.submitted_at as "submittedAt",
      json_object_agg(
        rc.category_key, rc.rating
      ) FILTER (WHERE rc.category_key IS NOT NULL) as "categoryRatings"
    FROM reviews r
    LEFT JOIN review_categories rc ON r.review_id = rc.review_id
    WHERE r.listing_id = $1
    GROUP BY r.review_id, r.listing_id, r.listing_name, r.guest_name, 
             r.overall_rating, r.public_review, r.submitted_at
    ORDER BY r.submitted_at DESC`,
    [listingId]
  );
  return result.rows;
}

async function getApprovalsForListing(listingId: string): Promise<Record<string, boolean>> {
  try {
    const command = new GetItemCommand({
      TableName: process.env.APPROVALS_TABLE || 'flex-living-reviews-dev-approvals',
      Key: {
        listingId: { S: listingId },
      },
    });

    const response = await dynamoClient.send(command);
    
    if (!response.Item) {
      return {};
    }

    const item = unmarshall(response.Item);
    return (item.approvals as Record<string, boolean>) || {};
  } catch (error) {
    console.error('Failed to get approvals from DynamoDB', { listingId, error });
    return {};
  }
}

export async function GET(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  const listingId = params.listingId;

  try {
    // Step 1: Get all reviews for the listing
    const reviews = await getReviewsByListingId(listingId);

    if (reviews.length === 0) {
      return NextResponse.json({
        reviews: [],
        total: 0,
        message: 'No reviews found for this listing',
      });
    }

    // Step 2: Get approvals for this listing
    const approvals = await getApprovalsForListing(listingId);

    // Step 3: Filter for approved reviews only and format them
    const approvedReviews = reviews
      .filter(review => approvals[review.reviewId] === true)
      .map(review => ({
        reviewId: review.reviewId,
        source: 'hostaway' as const,
        listingId: review.listingId,
        listingName: review.listingName,
        type: 'review',
        status: 'published',
        submittedAtISO: review.submittedAt,
        guestName: review.guestName,
        publicReview: review.reviewText,
        overallRating: review.overallRating,
        categories: review.categoryRatings
          ? Object.entries(review.categoryRatings).map(([key, rating]) => ({
              key,
              label: key.replace(/_/g, ' '),
              rating: rating as number,
            }))
          : [],
      }));

    console.log('Public reviews fetched', {
      listingId,
      totalReviews: reviews.length,
      approvedReviews: approvedReviews.length,
    });

    return NextResponse.json({
      listingId,
      reviews: approvedReviews,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Failed to fetch public reviews', {
      listingId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch reviews',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
