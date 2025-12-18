-- ============================================================================
-- PostgreSQL Schema for Flex Living Reviews System
-- ============================================================================

-- ============================================================================
-- Table: reviews
-- Stores normalized review data from multiple sources (Hostaway, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS reviews (
    review_id VARCHAR(255) PRIMARY KEY,  -- Format: 'hostaway:{id}' or 'source:{id}'
    source VARCHAR(50) NOT NULL,         -- 'hostaway', etc.
    hostaway_id INTEGER,                  -- Original ID from Hostaway API
    listing_id VARCHAR(255) NOT NULL,     -- Slugified listing identifier
    listing_name VARCHAR(255) NOT NULL,   -- Human-readable listing name
    type VARCHAR(50) NOT NULL,            -- Review type (e.g., 'guest')
    status VARCHAR(50) NOT NULL,          -- Review status (e.g., 'published')
    submitted_at TIMESTAMP NOT NULL,      -- When review was submitted (UTC)
    guest_name VARCHAR(255) NOT NULL,     -- Name of the guest who submitted
    public_review TEXT NOT NULL,          -- Review text content
    overall_rating FLOAT,                 -- Overall rating (nullable)
    raw JSONB,                            -- Original raw data from source API
    created_at TIMESTAMP DEFAULT NOW(),   -- When record was inserted
    updated_at TIMESTAMP DEFAULT NOW()    -- When record was last updated
);

-- Indexes for reviews table
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id 
    ON reviews(listing_id);

CREATE INDEX IF NOT EXISTS idx_reviews_listing_submitted 
    ON reviews(listing_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_listing_rating 
    ON reviews(listing_id, overall_rating DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_reviews_source 
    ON reviews(source);

CREATE INDEX IF NOT EXISTS idx_reviews_status 
    ON reviews(status);

CREATE INDEX IF NOT EXISTS idx_reviews_hostaway_id 
    ON reviews(hostaway_id) WHERE hostaway_id IS NOT NULL;

-- UPSERT suggestion:
-- INSERT INTO reviews (...) VALUES (...)
-- ON CONFLICT (review_id) 
-- DO UPDATE SET 
--   status = EXCLUDED.status,
--   public_review = EXCLUDED.public_review,
--   overall_rating = EXCLUDED.overall_rating,
--   raw = EXCLUDED.raw,
--   updated_at = NOW();


-- ============================================================================
-- Table: review_categories
-- Stores individual category ratings for each review
-- ============================================================================

CREATE TABLE IF NOT EXISTS review_categories (
    review_id VARCHAR(255) NOT NULL,      -- Foreign key to reviews.review_id
    category_key VARCHAR(100) NOT NULL,   -- Category identifier (e.g., 'cleanliness')
    category_label VARCHAR(255) NOT NULL, -- Human-readable label
    rating FLOAT NOT NULL,                -- Category rating value
    created_at TIMESTAMP DEFAULT NOW(),   -- When record was inserted
    
    PRIMARY KEY (review_id, category_key),
    
    CONSTRAINT fk_review_categories_review
        FOREIGN KEY (review_id) 
        REFERENCES reviews(review_id)
        ON DELETE CASCADE
);

-- Indexes for review_categories table
CREATE INDEX IF NOT EXISTS idx_review_categories_category_key 
    ON review_categories(category_key);

CREATE INDEX IF NOT EXISTS idx_review_categories_rating 
    ON review_categories(category_key, rating DESC);

-- UPSERT suggestion:
-- INSERT INTO review_categories (review_id, category_key, category_label, rating)
-- VALUES (?, ?, ?, ?)
-- ON CONFLICT (review_id, category_key)
-- DO UPDATE SET 
--   category_label = EXCLUDED.category_label,
--   rating = EXCLUDED.rating;


-- ============================================================================
-- Table: review_approvals_audit
-- Audit trail for review approval/rejection decisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS review_approvals_audit (
    id SERIAL PRIMARY KEY,                -- Auto-incrementing audit ID
    review_id VARCHAR(255) NOT NULL,      -- Review being approved/rejected
    listing_id VARCHAR(255) NOT NULL,     -- Listing the review belongs to
    is_approved BOOLEAN NOT NULL,         -- Approval status (true/false)
    approved_at TIMESTAMP NOT NULL DEFAULT NOW(),  -- When action occurred
    actor TEXT,                           -- Who performed the action (user ID, email, etc.)
    notes TEXT,                           -- Optional notes/reason
    
    CONSTRAINT fk_approvals_review
        FOREIGN KEY (review_id)
        REFERENCES reviews(review_id)
        ON DELETE CASCADE
);

-- Indexes for review_approvals_audit table
CREATE INDEX IF NOT EXISTS idx_approvals_review_id 
    ON review_approvals_audit(review_id);

CREATE INDEX IF NOT EXISTS idx_approvals_listing_id 
    ON review_approvals_audit(listing_id);

CREATE INDEX IF NOT EXISTS idx_approvals_approved_at 
    ON review_approvals_audit(approved_at DESC);

CREATE INDEX IF NOT EXISTS idx_approvals_is_approved 
    ON review_approvals_audit(is_approved);

-- UPSERT note:
-- This is an audit table - typically INSERT only, no updates
-- Each approval action creates a new audit record for full history


-- ============================================================================
-- Helpful Views
-- ============================================================================

-- View: Latest approval status per review
CREATE OR REPLACE VIEW review_latest_approval AS
SELECT DISTINCT ON (review_id)
    review_id,
    listing_id,
    is_approved,
    approved_at,
    actor,
    notes
FROM review_approvals_audit
ORDER BY review_id, approved_at DESC;

-- View: Approved reviews only
CREATE OR REPLACE VIEW approved_reviews AS
SELECT r.*
FROM reviews r
INNER JOIN review_latest_approval a ON r.review_id = a.review_id
WHERE a.is_approved = true;


-- ============================================================================
-- Utility Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on reviews table
DROP TRIGGER IF EXISTS trigger_reviews_updated_at ON reviews;
CREATE TRIGGER trigger_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- Sample Queries
-- ============================================================================

-- Get all reviews for a listing with categories:
-- SELECT r.*, json_agg(json_build_object(
--     'key', rc.category_key,
--     'label', rc.category_label,
--     'rating', rc.rating
-- )) as categories
-- FROM reviews r
-- LEFT JOIN review_categories rc ON r.review_id = rc.review_id
-- WHERE r.listing_id = 'cozy-downtown-apartment'
-- GROUP BY r.review_id
-- ORDER BY r.submitted_at DESC;

-- Get approved reviews only:
-- SELECT r.*, a.approved_at, a.actor
-- FROM reviews r
-- INNER JOIN review_latest_approval a ON r.review_id = a.review_id
-- WHERE a.is_approved = true
-- ORDER BY r.submitted_at DESC;

-- Calculate KPIs for a listing:
-- SELECT 
--   r.listing_id,
--   r.listing_name,
--   COUNT(*) as review_count,
--   AVG(r.overall_rating) as avg_overall_rating,
--   json_object_agg(
--     rc.category_key, 
--     AVG(rc.rating)
--   ) as avg_by_category
-- FROM reviews r
-- LEFT JOIN review_categories rc ON r.review_id = rc.review_id
-- WHERE r.listing_id = 'cozy-downtown-apartment'
-- GROUP BY r.listing_id, r.listing_name;
