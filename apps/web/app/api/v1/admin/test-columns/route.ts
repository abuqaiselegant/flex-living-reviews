/**
 * Test endpoint to check if approval columns exist
 * GET /api/v1/admin/test-columns
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  try {
    // Try to select approval columns
    const result = await pool.query(`
      SELECT 
        review_id,
        listing_id,
        is_approved,
        approved_at,
        approved_by
      FROM reviews
      LIMIT 5
    `);

    return NextResponse.json({
      ok: true,
      message: 'Columns exist',
      sample: result.rows,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Columns might not exist',
      },
      { status: 500 }
    );
  }
}
