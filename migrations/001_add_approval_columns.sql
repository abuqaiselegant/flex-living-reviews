-- Migration: Add approval status columns to reviews table
-- Date: 2025-12-18
-- Purpose: Simplify architecture by storing approvals directly in reviews table

-- Add approval columns to reviews table
ALTER TABLE reviews 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255) DEFAULT NULL;

-- Create index for faster filtering of approved reviews
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved) WHERE is_approved IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_listing_approved ON reviews(listing_id, is_approved);

-- Add comment
COMMENT ON COLUMN reviews.is_approved IS 'NULL = pending, TRUE = approved, FALSE = rejected';
COMMENT ON COLUMN reviews.approved_at IS 'Timestamp when approval decision was made';
COMMENT ON COLUMN reviews.approved_by IS 'User or system that made the approval decision';
