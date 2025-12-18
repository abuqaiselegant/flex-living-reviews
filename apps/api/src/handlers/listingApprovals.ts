/**
 * Lambda handler for fetching approval states for a listing
 * GET /v1/dashboard/listings/{listingId}/approvals
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ok, badRequest, serverError } from '../http/response';
import { getApprovalsForListing } from '../repos/approvalsRepo';

/**
 * Main Lambda handler for GET /v1/dashboard/listings/{listingId}/approvals
 * Returns approval states for all reviews in a listing
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Starting listing approvals fetch', { path: event.path });

  try {
    // Step 1: Extract listingId from path parameters
    const listingId = event.pathParameters?.listingId;

    if (!listingId) {
      console.error('Missing listingId in path parameters');
      return badRequest('listingId is required in path');
    }

    // Step 2: Fetch approval states from DynamoDB
    let approvals: Record<string, boolean>;

    try {
      approvals = await getApprovalsForListing(listingId);
      console.log('Approvals retrieved', {
        listingId,
        count: Object.keys(approvals).length,
      });
    } catch (error) {
      console.error('Failed to fetch approvals', {
        listingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return serverError('Failed to fetch approvals', {
        detail: error instanceof Error ? error.message : 'DynamoDB operation failed',
      });
    }

    // Step 3: Return response
    return ok({
      listingId,
      approvals,
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
