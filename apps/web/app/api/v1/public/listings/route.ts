/**
 * API Route for fetching public listings with approved review counts
 * GET /api/v1/public/listings
 * Updated: 2025-12-19 - Simplified to PostgreSQL-only architecture
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// Disable static optimization for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

async function getApprovedCountByListing(): Promise<Record<string, number>> {
  const result = await pool.query(`
    SELECT 
      listing_id,
      COUNT(*) as approved_count
    FROM reviews
    WHERE is_approved = true
    GROUP BY listing_id
  `);
  
  const approvedCounts: Record<string, number> = {};
  for (const row of result.rows) {
    approvedCounts[row.listing_id] = parseInt(row.approved_count);
  }
  return approvedCounts;
}

export async function GET() {
  try {
    // Step 1: Get all listings with their reviews
    const listingGroups = await queryListingKPIs();
    console.log('Listing groups retrieved', { count: listingGroups.length });

    // Step 2: Get approved counts from PostgreSQL
    const approvedCountsByListing = await getApprovedCountByListing();

    // Step 3: Build public listings - only include listings with approved reviews
    const publicListings: PublicListing[] = [];

    for (const group of listingGroups) {
      const approvedCount = approvedCountsByListing[group.listingId] || 0;

      // Only include listings with at least one approved review
      if (approvedCount > 0) {
        publicListings.push({
          listingId: group.listingId,
          listingName: group.listingName,
          approvedReviewCount: approvedCount,
          avgRating: group.avgRating,
        });
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
