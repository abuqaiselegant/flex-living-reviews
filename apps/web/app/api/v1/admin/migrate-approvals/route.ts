/**
 * API Route for migrating approval data from DynamoDB to PostgreSQL
 * POST /api/v1/admin/migrate-approvals
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function createDynamoClient() {
  return new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    maxAttempts: 3,
  });
}

export async function POST() {
  try {
    const dynamoClient = createDynamoClient();
    
    // Scan all approvals from DynamoDB
    const command = new ScanCommand({
      TableName: process.env.APPROVALS_TABLE || 'flex-living-reviews-dev-approvals',
    });

    const response = await dynamoClient.send(command);
    
    if (!response.Items || response.Items.length === 0) {
      return NextResponse.json({
        ok: true,
        message: 'No approvals found in DynamoDB',
        migrated: 0,
      });
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const item of response.Items) {
      const { listingId, reviewId, isApproved, approvedAt } = unmarshall(item);
      
      try {
        // Update PostgreSQL with approval data
        const result = await pool.query(
          `UPDATE reviews 
           SET is_approved = $1, 
               approved_at = $2,
               approved_by = 'migration'
           WHERE review_id = $3 AND listing_id = $4`,
          [isApproved, approvedAt || new Date().toISOString(), reviewId, listingId]
        );

        if (result.rowCount && result.rowCount > 0) {
          migratedCount++;
        } else {
          skippedCount++;
          console.log('Review not found in PostgreSQL', { reviewId, listingId });
        }
      } catch (err) {
        console.error('Failed to migrate approval', { reviewId, listingId, error: err });
        skippedCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: 'Migration completed',
      migrated: migratedCount,
      skipped: skippedCount,
      total: response.Items.length,
    });
  } catch (error) {
    console.error('Migration failed', { error });
    return NextResponse.json(
      {
        error: 'Migration failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
