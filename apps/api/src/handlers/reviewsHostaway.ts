/**
 * Lambda handler for fetching and normalizing Hostaway reviews
 * GET /v1/reviews/hostaway
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ok, serverError } from '../http/response';
import { upsertReviews } from '../db/reviewsRepo';
import {
  HostawayRawResponse,
  NormalizedReview,
  ListingKPIs,
  ListingGroup,
} from '../types';

/**
 * Main Lambda handler for GET /v1/reviews/hostaway
 * Fetches raw Hostaway reviews, normalizes them via FastAPI service,
 * stores in PostgreSQL, and returns grouped KPIs by listing
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  console.log('Starting Hostaway reviews fetch', { path: event.path });

  try {
    // Step 1: Load mock Hostaway data
    console.log('Loading mock Hostaway data');
    const mockDataPath = join(__dirname, '../mock/hostaway.json');
    let rawHostawayData: HostawayRawResponse;

    try {
      const fileContent = readFileSync(mockDataPath, 'utf-8');
      rawHostawayData = JSON.parse(fileContent);
      console.log('Mock data loaded', { reviewCount: rawHostawayData.result.length });
    } catch (error) {
      console.error('Failed to load mock data', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return serverError('Failed to load Hostaway data', {
        detail: 'Mock data file not found or invalid',
      });
    }

    // Step 2: Call FastAPI normalizer service
    console.log('Calling normalizer service');
    const normalizerUrl = process.env.NORMALIZER_URL;

    if (!normalizerUrl) {
      console.error('NORMALIZER_URL environment variable not set');
      return serverError('Normalizer service not configured');
    }

    let normalizedReviews: NormalizedReview[];

    try {
      const response = await fetch(`${normalizerUrl}/normalize/hostaway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rawHostawayData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Normalizer service error', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        return serverError('Normalizer service failed', {
          status: response.status,
          detail: errorText,
        });
      }

      const normalizedData = await response.json() as { normalized: NormalizedReview[] };
      normalizedReviews = normalizedData.normalized;
      console.log('Reviews normalized', { count: normalizedReviews.length });
    } catch (error) {
      console.error('Failed to call normalizer service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: normalizerUrl,
      });
      return serverError('Failed to normalize reviews', {
        detail: 'Normalizer service unavailable',
        url: normalizerUrl,
      });
    }

    // Step 3: Upsert reviews into PostgreSQL
    console.log('Upserting reviews to database');

    try {
      await upsertReviews(normalizedReviews);
      console.log('Reviews upserted successfully');
    } catch (error) {
      console.error('Failed to upsert reviews', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return serverError('Failed to store reviews in database', {
        detail: error instanceof Error ? error.message : 'Database operation failed',
      });
    }

    // Step 4: Compute grouped response with KPIs
    console.log('Computing KPIs by listing');
    const listingGroups = computeListingGroups(normalizedReviews);

    const duration = Date.now() - startTime;
    console.log('Reviews fetch completed', {
      duration,
      totalReviews: normalizedReviews.length,
      listingsCount: listingGroups.length,
    });

    // Return response
    return ok({
      source: 'hostaway',
      generatedAt: new Date().toISOString(),
      totalReviews: normalizedReviews.length,
      listings: listingGroups,
    });
  } catch (error) {
    console.error('Unexpected error in handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return serverError('An unexpected error occurred', {
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Group normalized reviews by listing and compute KPIs
 * 
 * @param reviews - Array of normalized reviews
 * @returns Array of listing groups with KPIs
 */
function computeListingGroups(reviews: NormalizedReview[]): ListingGroup[] {
  // Group reviews by listingId
  const listingsMap = new Map<string, {
    listingName: string;
    reviews: NormalizedReview[];
    overallRatings: number[];
    categoryRatings: Map<string, number[]>;
  }>();

  for (const review of reviews) {
    if (!listingsMap.has(review.listingId)) {
      listingsMap.set(review.listingId, {
        listingName: review.listingName,
        reviews: [],
        overallRatings: [],
        categoryRatings: new Map(),
      });
    }

    const listing = listingsMap.get(review.listingId)!;
    listing.reviews.push(review);

    // Collect overall ratings (ignore null)
    if (review.overallRating !== null) {
      listing.overallRatings.push(review.overallRating);
    }

    // Collect category ratings
    for (const category of review.categories) {
      if (!listing.categoryRatings.has(category.key)) {
        listing.categoryRatings.set(category.key, []);
      }
      listing.categoryRatings.get(category.key)!.push(category.rating);
    }
  }

  // Convert to ListingGroup array with computed KPIs
  const listingGroups: ListingGroup[] = [];

  for (const [listingId, listing] of listingsMap.entries()) {
    // Calculate average overall rating (ignore null values)
    const avgOverallRating = listing.overallRatings.length > 0
      ? Math.round((listing.overallRatings.reduce((sum, r) => sum + r, 0) / listing.overallRatings.length) * 100) / 100
      : null;

    // Calculate average by category
    const avgByCategory: Record<string, number> = {};
    for (const [categoryKey, ratings] of listing.categoryRatings.entries()) {
      if (ratings.length > 0) {
        avgByCategory[categoryKey] = Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 100) / 100;
      }
    }

    const kpis: ListingKPIs = {
      reviewCount: listing.reviews.length,
      avgOverallRating,
      avgByCategory,
    };

    listingGroups.push({
      listingId,
      listingName: listing.listingName,
      kpis,
      reviews: listing.reviews,
    });
  }

  // Sort by listing name for consistent output
  listingGroups.sort((a, b) => a.listingName.localeCompare(b.listingName));

  return listingGroups;
}
