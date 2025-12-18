/**
 * API Route for fetching public listings with approved review counts
 * GET /api/v1/public/listings
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
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

// DynamoDB client - ensure fresh connections
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
});

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

export async function GET() {
  try {
    // Step 1: Get all listings with their reviews
    const listingGroups = await queryListingKPIs();
    console.log('Listing groups retrieved', { count: listingGroups.length });

    // Step 2: For each listing, get approval stats and filter
    const publicListings: PublicListing[] = [];

    for (const group of listingGroups) {
      try {
        // Get approvals for this listing
        const approvals = await getApprovalsForListing(group.listingId);
        
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
