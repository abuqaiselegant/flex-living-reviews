/**
 * API Route for fetching listing reviews with approval status
 * GET /api/v1/dashboard/listings/[listingId]/approvals
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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
      r.is_approved as "isApproved",
      json_object_agg(
        rc.category_key, rc.rating
      ) FILTER (WHERE rc.category_key IS NOT NULL) as "categoryRatings"
    FROM reviews r
    LEFT JOIN review_categories rc ON r.review_id = rc.review_id
    WHERE r.listing_id = $1
    GROUP BY r.review_id, r.listing_id, r.listing_name, r.guest_name, 
             r.overall_rating, r.public_review, r.submitted_at, r.is_approved
    ORDER BY r.submitted_at DESC`,
    [listingId]
  );
  return result.rows;
}

export async function GET(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  const listingId = params.listingId;

  try {
    // Get all reviews for the listing with approval status from PostgreSQL
    const reviews = await getReviewsByListingId(listingId);

    if (reviews.length === 0) {
      return NextResponse.json({
        reviews: [],
        total: 0,
        message: 'No reviews found for this listing',
      });
    }

    // Add isPending flag based on isApproved value from PostgreSQL
    const reviewsWithApprovalStatus = reviews.map(review => ({
      ...review,
      isApproved: review.isApproved === true,
      isPending: review.isApproved === null,
    }));

    console.log('Reviews with approval status fetched', {
      listingId,
      totalReviews: reviews.length,
    });

    return NextResponse.json({
      reviews: reviewsWithApprovalStatus,
      total: reviewsWithApprovalStatus.length,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Failed to fetch reviews with approval status', {
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
