/**
 * API Route for running database migration
 * POST /api/v1/admin/migrate
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function POST() {
  try {
    const migration = `
      -- Add approval columns to reviews table
      ALTER TABLE reviews 
      ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255) DEFAULT NULL;

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved) WHERE is_approved IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_reviews_listing_approved ON reviews(listing_id, is_approved);
    `;

    await pool.query(migration);

    return NextResponse.json({
      ok: true,
      message: 'Migration completed successfully',
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
