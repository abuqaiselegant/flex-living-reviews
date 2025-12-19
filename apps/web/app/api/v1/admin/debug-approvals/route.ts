/**
 * Debug endpoint to check approval status in PostgreSQL
 * GET /api/v1/admin/debug-approvals
 */

import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        review_id,
        listing_id,
        listing_name,
        is_approved,
        approved_at,
        approved_by
      FROM reviews
      WHERE listing_id IN ('listing-101', 'listing-202', 'listing-303')
      ORDER BY listing_id, review_id
    `);

    return NextResponse.json({
      ok: true,
      reviews: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error('Debug query failed', { error });
    return NextResponse.json(
      {
        error: 'Query failed',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
