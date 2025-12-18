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
    // Step 1: Get all listings with KPIs
    const listingGroups = await queryListingKPIs();

    // Step 2: Get all approvals
    const allApprovals = await getAllApprovals();

    // Step 3: Combine data
    const dashboardListings = listingGroups.map(group => {
      const approvals = allApprovals[group.listingId] || {};
      
      const approvedCount = Object.values(approvals).filter(
        isApproved => isApproved === true
      ).length;

      const pendingCount = group.totalReviews - approvedCount;

      return {
        listingId: group.listingId,
        listingName: group.listingName,
        totalReviews: group.totalReviews,
        approvedReviews: approvedCount,
        pendingReviews: pendingCount,
        avgRating: group.avgRating,
      };
    });

    console.log('Dashboard listings prepared', {
      totalListings: dashboardListings.length,
    });

    return NextResponse.json({
      listings: dashboardListings,
      total: dashboardListings.length,
    });

  } catch (error) {
    console.error('Failed to fetch dashboard listings', {
      error: error instanceof Error ? error.message : 'Unknown error',
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
