/**
 * API Route for fetching approved reviews for a listing
 * GET /api/v1/public/listings/[listingId]/reviews
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
    WHERE r.listing_id = $1 AND r.is_approved = true
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
    // Get approved reviews for the listing (filtered in SQL query above)
    const approvedReviews = await getReviewsByListingId(listingId);

    // Format reviews for frontend
    const formattedReviews = approvedReviews.map(review => ({
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
      approvedReviews: formattedReviews.length,
    });

    return NextResponse.json({
      listingId,
      reviews: formattedReviews,
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
