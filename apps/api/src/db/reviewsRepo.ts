/**
 * Repository for review data operations in PostgreSQL
 */

import { PoolClient } from 'pg';
import { withClient, withTransaction } from './postgres';
import {
  NormalizedReview,
  NormalizedCategory,
  ListingKPIs,
  ListingGroup,
} from '../types';

/**
 * Upsert normalized reviews into the database
 * Updates existing reviews or inserts new ones based on review_id
 * 
 * @param reviews - Array of normalized reviews to upsert
 */
export async function upsertReviews(reviews: NormalizedReview[]): Promise<void> {
  if (reviews.length === 0) {
    return;
  }

  await withTransaction(async (client) => {
    for (const review of reviews) {
      // Upsert review record
      await client.query(
        `
        INSERT INTO reviews (
          review_id, source, hostaway_id, listing_id, listing_name,
          type, status, submitted_at, guest_name, public_review,
          overall_rating, raw
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (review_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          public_review = EXCLUDED.public_review,
          overall_rating = EXCLUDED.overall_rating,
          raw = EXCLUDED.raw,
          updated_at = NOW()
        `,
        [
          review.reviewId,
          review.source,
          review.source === 'hostaway' ? parseInt(String(review.reviewId).split(':')[1]) : null,
          review.listingId,
          review.listingName,
          review.type,
          review.status,
          review.submittedAtISO,
          review.guestName,
          review.publicReview,
          review.overallRating,
          JSON.stringify(review), // Store full normalized review as raw data
        ]
      );

      // Replace categories for this review
      await replaceCategories(review.reviewId, review.categories, client);
    }
  });

  console.log(`Upserted ${reviews.length} reviews`);
}

/**
 * Replace all categories for a review
 * Deletes existing categories and inserts new ones in a transaction
 * 
 * @param reviewId - Review ID to update categories for
 * @param categories - New categories to set
 * @param client - Optional existing client (for transaction contexts)
 */
export async function replaceCategories(
  reviewId: string,
  categories: NormalizedCategory[],
  client?: PoolClient
): Promise<void> {
  const execute = async (c: PoolClient) => {
    // Delete existing categories
    await c.query(
      'DELETE FROM review_categories WHERE review_id = $1',
      [reviewId]
    );

    // Insert new categories
    if (categories.length > 0) {
      for (const category of categories) {
        await c.query(
          `
          INSERT INTO review_categories (review_id, category_key, category_label, rating)
          VALUES ($1, $2, $3, $4)
          `,
          [reviewId, category.key, category.label, category.rating]
        );
      }
    }
  };

  if (client) {
    // Use existing client (already in transaction)
    await execute(client);
  } else {
    // Create new transaction
    await withTransaction(execute);
  }
}

/**
 * Get reviews by their IDs with categories
 * 
 * @param ids - Array of review IDs to fetch
 * @returns Array of normalized reviews with categories
 */
export async function getReviewsByIds(ids: string[]): Promise<NormalizedReview[]> {
  if (ids.length === 0) {
    return [];
  }

  return withClient(async (client) => {
    // Fetch reviews
    const reviewsResult = await client.query(
      `
      SELECT 
        review_id, source, listing_id, listing_name, type, status,
        submitted_at, guest_name, public_review, overall_rating
      FROM reviews
      WHERE review_id = ANY($1)
      ORDER BY submitted_at DESC
      `,
      [ids]
    );

    if (reviewsResult.rows.length === 0) {
      return [];
    }

    // Fetch categories for these reviews
    const categoriesResult = await client.query(
      `
      SELECT review_id, category_key, category_label, rating
      FROM review_categories
      WHERE review_id = ANY($1)
      ORDER BY review_id, category_key
      `,
      [ids]
    );

    // Group categories by review_id
    const categoriesMap = new Map<string, NormalizedCategory[]>();
    for (const row of categoriesResult.rows) {
      if (!categoriesMap.has(row.review_id)) {
        categoriesMap.set(row.review_id, []);
      }
      categoriesMap.get(row.review_id)!.push({
        key: row.category_key,
        label: row.category_label,
        rating: row.rating,
      });
    }

    // Combine reviews with their categories
    const reviews: NormalizedReview[] = reviewsResult.rows.map((row) => ({
      reviewId: row.review_id,
      source: row.source,
      listingId: row.listing_id,
      listingName: row.listing_name,
      type: row.type,
      status: row.status,
      submittedAtISO: row.submitted_at.toISOString(),
      guestName: row.guest_name,
      publicReview: row.public_review,
      overallRating: row.overall_rating,
      categories: categoriesMap.get(row.review_id) || [],
    }));

    return reviews;
  });
}

/**
 * Query listing KPIs with optional filters
 * 
 * @param listingId - Optional listing ID to filter by
 * @param from - Optional start date (ISO string)
 * @param to - Optional end date (ISO string)
 * @returns Array of listing groups with KPIs and reviews
 */
export async function queryListingKPIs(
  listingId?: string,
  from?: string,
  to?: string
): Promise<ListingGroup[]> {
  return withClient(async (client) => {
    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (listingId) {
      conditions.push(`r.listing_id = $${paramIndex}`);
      params.push(listingId);
      paramIndex++;
    }

    if (from) {
      conditions.push(`r.submitted_at >= $${paramIndex}`);
      params.push(from);
      paramIndex++;
    }

    if (to) {
      conditions.push(`r.submitted_at <= $${paramIndex}`);
      params.push(to);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Fetch reviews with categories
    const reviewsResult = await client.query(
      `
      SELECT 
        r.review_id, r.source, r.listing_id, r.listing_name, r.type, r.status,
        r.submitted_at, r.guest_name, r.public_review, r.overall_rating,
        rc.category_key, rc.category_label, rc.rating as category_rating
      FROM reviews r
      LEFT JOIN review_categories rc ON r.review_id = rc.review_id
      ${whereClause}
      ORDER BY r.listing_id, r.submitted_at DESC, rc.category_key
      `,
      params
    );

    if (reviewsResult.rows.length === 0) {
      return [];
    }

    // Group by listing
    const listingsMap = new Map<string, {
      listingName: string;
      reviews: Map<string, NormalizedReview>;
      allRatings: number[];
      categoryRatings: Map<string, number[]>;
    }>();

    for (const row of reviewsResult.rows) {
      const lid = row.listing_id;

      if (!listingsMap.has(lid)) {
        listingsMap.set(lid, {
          listingName: row.listing_name,
          reviews: new Map(),
          allRatings: [],
          categoryRatings: new Map(),
        });
      }

      const listing = listingsMap.get(lid)!;

      // Add or update review
      if (!listing.reviews.has(row.review_id)) {
        listing.reviews.set(row.review_id, {
          reviewId: row.review_id,
          source: row.source,
          listingId: row.listing_id,
          listingName: row.listing_name,
          type: row.type,
          status: row.status,
          submittedAtISO: row.submitted_at.toISOString(),
          guestName: row.guest_name,
          publicReview: row.public_review,
          overallRating: row.overall_rating,
          categories: [],
        });

        // Track overall rating for KPI calculation
        if (row.overall_rating !== null) {
          listing.allRatings.push(row.overall_rating);
        }
      }

      // Add category to review
      if (row.category_key) {
        const review = listing.reviews.get(row.review_id)!;
        review.categories.push({
          key: row.category_key,
          label: row.category_label,
          rating: row.category_rating,
        });

        // Track category rating for KPI calculation
        if (!listing.categoryRatings.has(row.category_key)) {
          listing.categoryRatings.set(row.category_key, []);
        }
        listing.categoryRatings.get(row.category_key)!.push(row.category_rating);
      }
    }

    // Build final response with KPIs
    const listingGroups: ListingGroup[] = [];

    for (const [lid, listing] of listingsMap.entries()) {
      const reviewsArray = Array.from(listing.reviews.values());

      // Calculate KPIs
      const avgOverallRating = listing.allRatings.length > 0
        ? listing.allRatings.reduce((sum, r) => sum + r, 0) / listing.allRatings.length
        : null;

      const avgByCategory: Record<string, number> = {};
      for (const [catKey, ratings] of listing.categoryRatings.entries()) {
        if (ratings.length > 0) {
          avgByCategory[catKey] = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        }
      }

      const kpis: ListingKPIs = {
        reviewCount: reviewsArray.length,
        avgOverallRating,
        avgByCategory,
      };

      listingGroups.push({
        listingId: lid,
        listingName: listing.listingName,
        kpis,
        reviews: reviewsArray,
      });
    }

    return listingGroups;
  });
}
