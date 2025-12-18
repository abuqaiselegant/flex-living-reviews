/**
 * API Route for approving/rejecting a review
 * POST /api/v1/reviews/[reviewId]/approve
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

async function getReviewById(reviewId: string) {
  const result = await pool.query(
    `SELECT 
      review_id as "reviewId",
      listing_id as "listingId",
      listing_name as "listingName",
      guest_name as "guestName",
      rating,
      comment
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
  const command = new UpdateItemCommand({
    TableName: process.env.APPROVALS_TABLE || 'flex-living-reviews-dev-approvals',
    Key: {
      listingId: { S: listingId },
    },
    UpdateExpression: 'SET approvals.#reviewId = :isApproved',
    ExpressionAttributeNames: {
      '#reviewId': reviewId,
    },
    ExpressionAttributeValues: {
      ':isApproved': { BOOL: isApproved },
    },
  });

  await dynamoClient.send(command);
}

async function recordApprovalAudit(
  reviewId: string,
  listingId: string,
  isApproved: boolean,
  approvedBy: string
): Promise<void> {
  await pool.query(
    `INSERT INTO approval_audit (
      review_id, listing_id, approved_by, is_approved, approved_at
    ) VALUES ($1, $2, $3, $4, NOW())`,
    [reviewId, listingId, approvedBy, isApproved]
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
    const { isApproved, approvedBy } = body;

    // Validate request
    if (typeof isApproved !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: isApproved must be a boolean' },
        { status: 400 }
      );
    }

    if (!approvedBy || typeof approvedBy !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: approvedBy is required' },
        { status: 400 }
      );
    }

    // Step 1: Get the review to verify it exists and get listing ID
    const review = await getReviewById(reviewId);

    if (!review) {
      return NextResponse.json(
        { error: 'Review not found', reviewId },
        { status: 404 }
      );
    }

    // Step 2: Update approval status in DynamoDB
    await updateApprovalStatus(review.listingId, reviewId, isApproved);

    // Step 3: Record audit trail
    await recordApprovalAudit(reviewId, review.listingId, isApproved, approvedBy);

    console.log('Review approval updated', {
      reviewId,
      listingId: review.listingId,
      isApproved,
      approvedBy,
    });

    return NextResponse.json({
      success: true,
      reviewId,
      listingId: review.listingId,
      isApproved,
      message: isApproved ? 'Review approved' : 'Review rejected',
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
