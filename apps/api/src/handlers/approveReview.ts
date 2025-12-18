/**
 * Lambda handler for approving/rejecting reviews
 * POST /v1/reviews/{reviewId}/approve
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, badRequest, serverError } from '../http/response';
import { parseJsonBody, requireString, requireBoolean } from '../http/validate';
import { setApproval } from '../repos/approvalsRepo';
import { withClient } from '../db/postgres';

/**
 * Main Lambda handler for POST /v1/reviews/{reviewId}/approve
 * Approves or rejects a review by storing approval status in DynamoDB
 * and creating an audit record in PostgreSQL
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Starting review approval', { path: event.path });

  try {
    // Step 1: Extract reviewId from path parameters
    const reviewId = event.pathParameters?.reviewId;

    if (!reviewId) {
      console.error('Missing reviewId in path parameters');
      return badRequest('reviewId is required in path');
    }

    console.log('Processing approval', { reviewId });

    // Step 2: Parse and validate request body
    let listingId: string;
    let isApproved: boolean;

    try {
      const body = parseJsonBody(event);
      listingId = requireString(body.listingId, 'listingId');
      isApproved = requireBoolean(body.isApproved, 'isApproved');
    } catch (error) {
      console.error('Request validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return badRequest(
        error instanceof Error ? error.message : 'Invalid request body'
      );
    }

    console.log('Request validated', { reviewId, listingId, isApproved });

    // Step 3: Write approval to DynamoDB
    try {
      await setApproval(listingId, reviewId, isApproved);
    } catch (error) {
      console.error('Failed to write approval to DynamoDB', {
        reviewId,
        listingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return serverError('Failed to set approval status', {
        detail: error instanceof Error ? error.message : 'DynamoDB operation failed',
      });
    }

    // Step 4: Insert audit record into PostgreSQL
    const approvedAt = new Date().toISOString();

    try {
      await withClient(async (client) => {
        await client.query(
          `
          INSERT INTO review_approvals_audit (
            review_id, listing_id, is_approved, approved_at, actor
          )
          VALUES ($1, $2, $3, $4, $5)
          `,
          [
            reviewId,
            listingId,
            isApproved,
            approvedAt,
            event.requestContext?.identity?.sourceIp || 'unknown', // Use IP as actor identifier
          ]
        );
      });

      console.log('Audit record created', { reviewId, listingId, isApproved });
    } catch (error) {
      console.error('Failed to insert audit record', {
        reviewId,
        listingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Note: DynamoDB write succeeded, so we log but don't fail the request
      // This ensures idempotency - the approval state is set even if audit fails
      console.warn('Continuing despite audit failure - approval status is set in DynamoDB');
    }

    // Step 5: Return success response
    console.log('Approval completed successfully', {
      reviewId,
      listingId,
      isApproved,
    });

    return ok({
      ok: true,
      reviewId,
      listingId,
      isApproved,
      approvedAt,
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
