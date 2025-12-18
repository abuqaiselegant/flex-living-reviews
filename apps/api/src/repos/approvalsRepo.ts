/**
 * Repository for review approval data in DynamoDB
 * Supports local mock mode when USE_MOCK_APPROVALS=true
 */

import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoClient } from '../aws/dynamo';

// Mock approvals storage for local development
const mockApprovals = new Map<string, Map<string, boolean>>();

/**
 * Check if we should use mock approvals (local development mode)
 */
function useMockMode(): boolean {
  return process.env.USE_MOCK_APPROVALS === 'true';
}

/**
 * Set approval status for a review
 * 
 * @param listingId - Listing ID (partition key)
 * @param reviewId - Review ID (sort key)
 * @param isApproved - Whether the review is approved
 * @throws Error if DynamoDB operation fails
 */
export async function setApproval(
  listingId: string,
  reviewId: string,
  isApproved: boolean
): Promise<void> {
  if (!listingId || !reviewId) {
    throw new Error('listingId and reviewId are required');
  }

  // Mock mode for local development
  if (useMockMode()) {
    if (!mockApprovals.has(listingId)) {
      mockApprovals.set(listingId, new Map());
    }
    mockApprovals.get(listingId)!.set(reviewId, isApproved);
    console.log('Mock approval set', { listingId, reviewId, isApproved });
    return;
  }

  // Real DynamoDB mode
  const tableName = process.env.APPROVALS_TABLE;

  if (!tableName) {
    throw new Error('APPROVALS_TABLE environment variable is not set');
  }

  const client = getDynamoClient();

  try {
    await client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          listingId,
          reviewId,
          isApproved,
          approvedAt: new Date().toISOString(),
        },
      })
    );

    console.log('Approval set', { listingId, reviewId, isApproved });
  } catch (error) {
    console.error('Failed to set approval', {
      listingId,
      reviewId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Failed to set approval: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all approval statuses for a listing
 * 
 * @param listingId - Listing ID to query
 * @returns Map of reviewId to approval status
 * @throws Error if DynamoDB operation fails
 */
export async function getApprovalsForListing(
  listingId: string
): Promise<Record<string, boolean>> {
  if (!listingId) {
    throw new Error('listingId is required');
  }

  // Mock mode for local development
  if (useMockMode()) {
    const approvals: Record<string, boolean> = {};
    const listingApprovals = mockApprovals.get(listingId);
    
    if (listingApprovals) {
      for (const [reviewId, isApproved] of listingApprovals.entries()) {
        approvals[reviewId] = isApproved;
      }
    }
    
    console.log('Mock approvals retrieved', { listingId, count: Object.keys(approvals).length });
    return approvals;
  }

  // Real DynamoDB mode
  const tableName = process.env.APPROVALS_TABLE;

  if (!tableName) {
    throw new Error('APPROVALS_TABLE environment variable is not set');
  }

  const client = getDynamoClient();

  try {
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'listingId = :listingId',
        ExpressionAttributeValues: {
          ':listingId': listingId,
        },
      })
    );

    const approvals: Record<string, boolean> = {};

    if (result.Items && result.Items.length > 0) {
      for (const item of result.Items) {
        if (item.reviewId && typeof item.isApproved === 'boolean') {
          approvals[item.reviewId] = item.isApproved;
        }
      }
    }

    console.log('Approvals retrieved', { listingId, count: Object.keys(approvals).length });

    return approvals;
  } catch (error) {
    console.error('Failed to get approvals for listing', {
      listingId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Failed to get approvals: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get list of approved review IDs for a listing
 * 
 * @param listingId - Listing ID to query
 * @returns Array of approved review IDs
 * @throws Error if DynamoDB operation fails
 */
export async function getApprovedReviewIds(listingId: string): Promise<string[]> {
  if (!listingId) {
    throw new Error('listingId is required');
  }

  // Mock mode for local development
  if (useMockMode()) {
    const approvedIds: string[] = [];
    const listingApprovals = mockApprovals.get(listingId);
    
    if (listingApprovals) {
      for (const [reviewId, isApproved] of listingApprovals.entries()) {
        if (isApproved === true) {
          approvedIds.push(reviewId);
        }
      }
    }
    
    console.log('Mock approved review IDs retrieved', { listingId, count: approvedIds.length });
    return approvedIds;
  }

  // Real DynamoDB mode
  const tableName = process.env.APPROVALS_TABLE;

  if (!tableName) {
    throw new Error('APPROVALS_TABLE environment variable is not set');
  }

  const client = getDynamoClient();

  try {
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'listingId = :listingId',
        FilterExpression: 'isApproved = :approved',
        ExpressionAttributeValues: {
          ':listingId': listingId,
          ':approved': true,
        },
      })
    );

    const approvedIds: string[] = [];

    if (result.Items && result.Items.length > 0) {
      for (const item of result.Items) {
        if (item.reviewId && item.isApproved === true) {
          approvedIds.push(item.reviewId);
        }
      }
    }

    console.log('Approved review IDs retrieved', { listingId, count: approvedIds.length });

    return approvedIds;
  } catch (error) {
    console.error('Failed to get approved review IDs', {
      listingId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Failed to get approved review IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
