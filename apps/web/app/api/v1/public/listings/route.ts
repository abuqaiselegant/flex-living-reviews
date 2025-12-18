/**
 * API Route for fetching public listings with approved review counts
 * GET /api/v1/public/listings
 * Updated: 2025-12-18 - Fixed DynamoDB composite key reads
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

interface PublicListing {
  listingId: string;
  listingName: string;
  approvedReviewCount: number;
  avgRating: number | null;
}

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

async function queryListingKPIs() {
  const result = await pool.query(`
    SELECT 
      listing_id as "listingId",
      listing_name as "listingName",
      total_reviews as "totalReviews",
      avg_rating as "avgRating"
    FROM listing_kpis
    ORDER BY listing_name
  `);
  return result.rows;
}

async function getAllApprovals(): Promise<Record<string, Record<string, boolean>>> {
  try {
    const dynamoClient = createDynamoClient();
    
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
      const { listingId, reviewId, isApproved } = unmarshalled;
      
      if (!approvalsByListing[listingId]) {
        approvalsByListing[listingId] = {};
      }
      
      approvalsByListing[listingId][reviewId] = isApproved;
    }

    return approvalsByListing;
  } catch (error) {
    console.error('Failed to scan approvals from DynamoDB', { error });
    return {};
  }
}

export async function GET() {
  try {
    // Step 1: Get all listings with their reviews
    const listingGroups = await queryListingKPIs();
    console.log('Listing groups retrieved', { count: listingGroups.length });

    // Step 2: Get all approvals once
    const approvalsByListing = await getAllApprovals();

    // Step 3: For each listing, calculate approved count and filter
    const publicListings: PublicListing[] = [];

    for (const group of listingGroups) {
      try {
        // Get approvals for this listing
        const approvals = approvalsByListing[group.listingId] || {};
        
        // Count approved reviews
        const approvedReviewIds = Object.entries(approvals)
          .filter(([_, isApproved]) => isApproved === true)
          .map(([reviewId]) => reviewId);

        const approvedCount = approvedReviewIds.length;

        // Only include listings with at least one approved review
        if (approvedCount > 0) {
          publicListings.push({
            listingId: group.listingId,
            listingName: group.listingName,
            approvedReviewCount: approvedCount,
            avgRating: group.avgRating,
          });
        }
      } catch (error) {
        console.error('Error processing listing', { 
          listingId: group.listingId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Continue with next listing even if one fails
      }
    }

    console.log('Public listings prepared', {
      totalListings: listingGroups.length,
      publicListings: publicListings.length,
    });

    return NextResponse.json({
      listings: publicListings,
      total: publicListings.length,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Failed to fetch public listings', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch listings',
        detail: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
