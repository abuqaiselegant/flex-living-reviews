/**
 * API Route for fetching dashboard listings with approval stats
 * GET /api/v1/dashboard/listings
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

interface ReviewWithCategories {
  reviewId: string;
  listingId: string;
  listingName: string;
  overallRating: number;
  submittedAt: string;
  guestName: string;
  reviewText: string;
  categories: Record<string, number>;
}

async function queryReviewsWithCategories() {
  const result = await pool.query(`
    SELECT 
      r.review_id as "reviewId",
      r.listing_id as "listingId",
      r.listing_name as "listingName",
      r.overall_rating as "overallRating",
      r.submitted_at as "submittedAt",
      r.guest_name as "guestName",
      r.public_review as "reviewText",
      json_object_agg(
        rc.category_key, rc.rating
      ) FILTER (WHERE rc.category_key IS NOT NULL) as categories
    FROM reviews r
    LEFT JOIN review_categories rc ON r.review_id = rc.review_id
    GROUP BY r.review_id, r.listing_id, r.listing_name, r.overall_rating, 
             r.submitted_at, r.guest_name, r.public_review
    ORDER BY r.listing_name, r.submitted_at DESC
  `);
  return result.rows as ReviewWithCategories[];
}

async function getAllApprovals(): Promise<Record<string, Record<string, boolean>>> {
  try {
    const command = new ScanCommand({
      TableName: process.env.APPROVALS_TABLE || 'flex-living-reviews-dev-approvals',
    });

    const response = await dynamoClient.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      return {};
    }

    const approvalsByListing: Record<string, Record<string, boolean>> = {};
    
    for (const item of response.Items) {
      const unmarshalled = unmarshall(item);
      approvalsByListing[unmarshalled.listingId] = unmarshalled.approvals || {};
    }

    return approvalsByListing;
  } catch (error) {
    console.error('Failed to scan approvals from DynamoDB', { error });
    return {};
  }
}

export async function GET() {
  try {
    // Step 1: Get all reviews with categories
    const allReviews = await queryReviewsWithCategories();

    // Step 2: Get all approvals
    const allApprovals = await getAllApprovals();

    // Step 3: Group reviews by listing and calculate KPIs
    const listingsMap: Record<string, {
      listingId: string;
      listingName: string;
      reviews: ReviewWithCategories[];
    }> = {};

    for (const review of allReviews) {
      if (!listingsMap[review.listingId]) {
        listingsMap[review.listingId] = {
          listingId: review.listingId,
          listingName: review.listingName,
          reviews: [],
        };
      }
      listingsMap[review.listingId].reviews.push(review);
    }

    // Step 4: Build dashboard listings
    const dashboardListings = Object.values(listingsMap).map(listing => {
      const approvals = allApprovals[listing.listingId] || {};
      const reviews = listing.reviews;

      // Calculate approval stats - count only explicitly approved reviews
      let approvedCount = 0;
      let rejectedCount = 0;
      
      reviews.forEach(review => {
        const approvalStatus = approvals[review.reviewId];
        if (approvalStatus === true) {
          approvedCount++;
        } else if (approvalStatus === false) {
          rejectedCount++;
        }
      });
      
      const pendingCount = reviews.length - approvedCount - rejectedCount;

      // Calculate KPIs
      const avgOverallRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
        : null;

      // Calculate average by category
      const categoryTotals: Record<string, { sum: number; count: number }> = {};
      for (const review of reviews) {
        if (review.categories) {
          for (const [key, rating] of Object.entries(review.categories)) {
            if (!categoryTotals[key]) {
              categoryTotals[key] = { sum: 0, count: 0 };
            }
            categoryTotals[key].sum += rating;
            categoryTotals[key].count += 1;
          }
        }
      }

      const avgByCategory: Record<string, number> = {};
      for (const [key, { sum, count }] of Object.entries(categoryTotals)) {
        avgByCategory[key] = sum / count;
      }

      // Find worst category
      let worstCategory: { key: string; avgRating: number } | null = null;
      for (const [key, avgRating] of Object.entries(avgByCategory)) {
        if (!worstCategory || avgRating < worstCategory.avgRating) {
          worstCategory = { key, avgRating };
        }
      }

      // Format reviews for frontend
      const latestReviews = reviews.map(r => ({
        reviewId: r.reviewId,
        source: 'hostaway' as const,
        listingId: r.listingId,
        listingName: r.listingName,
        type: 'review',
        status: 'published',
        overallRating: r.overallRating,
        submittedAtISO: r.submittedAt,
        guestName: r.guestName,
        publicReview: r.reviewText,
        categories: r.categories 
          ? Object.entries(r.categories).map(([key, rating]) => ({
              key,
              label: key.replace(/_/g, ' '),
              rating: rating as number,
            }))
          : [],
      }));

      return {
        listingId: listing.listingId,
        listingName: listing.listingName,
        kpis: {
          reviewCount: reviews.length,
          avgOverallRating,
          avgByCategory,
          worstCategory,
        },
        approvalStats: {
          totalReviews: reviews.length,
          approvedCount,
          pendingCount,
        },
        latestReviews,
      };
    });

    console.log('Dashboard listings prepared', {
      totalListings: dashboardListings.length,
    });

    return NextResponse.json({
      listings: dashboardListings,
      meta: {
        total: dashboardListings.length,
        returned: dashboardListings.length,
        hasMore: false,
        filters: {},
        sort: 'name',
      },
    });

  } catch (error) {
    console.error('Failed to fetch dashboard listings', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard data',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
