/**
 * API Route for approving/rejecting a review
 * POST /api/v1/reviews/[reviewId]/approve
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Create fresh DynamoDB client for each request to avoid caching
function createDynamoClient() {
  return new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    maxAttempts: 3,
  });
}

async function getReviewById(reviewId: string) {
  const result = await pool.query(
    `SELECT 
      review_id as "reviewId",
      listing_id as "listingId",
      listing_name as "listingName",
      guest_name as "guestName",
      overall_rating as "overallRating",
      public_review as "reviewText"
    FROM reviews
    WHERE review_id = $1`,
    [reviewId]
  );
  return result.rows[0];
}

async function updateApprovalStatus(
  listingId: string,
  reviewId: string,
  isApproved: boolean
): Promise<void> {
  const dynamoClient = createDynamoClient();
  
  const command = new PutItemCommand({
    TableName: process.env.APPROVALS_TABLE || 'flex-living-reviews-dev-approvals',
    Item: {
      listingId: { S: listingId },
      reviewId: { S: reviewId },
      isApproved: { BOOL: isApproved },
      approvedAt: { S: new Date().toISOString() },
    },
  });

  await dynamoClient.send(command);
}

async function recordApprovalAudit(
  reviewId: string,
  listingId: string,
  isApproved: boolean,
  actor: string
): Promise<void> {
  await pool.query(
    `INSERT INTO review_approvals_audit (
      review_id, listing_id, is_approved, actor, approved_at
    ) VALUES ($1, $2, $3, $4, NOW())`,
    [reviewId, listingId, isApproved, actor]
  );
}

export async function POST(
  request: Request,
  { params }: { params: { reviewId: string } }
) {
  const reviewId = params.reviewId;

  try {
    // Parse request body
    const body = await request.json();
    const { listingId, isApproved } = body;

    // Validate request
    if (typeof isApproved !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: isApproved must be a boolean' },
        { status: 400 }
      );
    }

    if (!listingId || typeof listingId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: listingId is required' },
        { status: 400 }
      );
    }

    // Step 1: Get the review to verify it exists
    const review = await getReviewById(reviewId);

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found', reviewId },
        { status: 404 }
      );
    }

    // Verify listing ID matches
    if (review.listingId !== listingId) {
      return NextResponse.json(
        { error: 'Listing ID mismatch' },
        { status: 400 }
      );
    }

    // Step 2: Update approval status in DynamoDB
    await updateApprovalStatus(listingId, reviewId, isApproved);

    // Step 3: Record audit trail (use 'system' as default approver)
    await recordApprovalAudit(reviewId, listingId, isApproved, 'system');

    console.log('Review approval updated', {
      reviewId,
      listingId,
      isApproved,
    });

    return NextResponse.json({
      ok: true,
      reviewId,
      listingId,
      isApproved,
      approvedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to update review approval', {
      reviewId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: 'Failed to update review approval',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
