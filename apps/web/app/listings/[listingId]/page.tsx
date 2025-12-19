'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchPublicReviews, ApiError } from '../../../lib/api';
import { NormalizedReview } from '../../../lib/types';

// Generate avatar color from name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-emerald-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-rose-500',
    'bg-indigo-500',
  ];
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PropertyPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.listingId as string;

  const [reviews, setReviews] = useState<NormalizedReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (listingId) {
      loadReviews();
    }
  }, [listingId]);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchPublicReviews(listingId);
      setReviews(response.reviews);
    } catch (err) {
      console.error('Failed to load reviews', err);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load reviews'
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate average rating
  const reviewsWithRatings = reviews.filter((r) => r.overallRating !== null);
  const avgRating = reviewsWithRatings.length > 0
    ? reviewsWithRatings.reduce((sum, r) => sum + (r.overallRating || 0), 0) / reviewsWithRatings.length
    : null;

  // Get property name from first review or use listingId
  const propertyName = reviews.length > 0 ? reviews[0].listingName : listingId;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-900 mx-auto"></div>
          <p className="mt-6 text-slate-600 font-medium">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Header */}
      <header className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-800/50 via-transparent to-transparent"></div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Navigation Buttons */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">Home</span>
            </Link>
            <span className="text-slate-500">|</span>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="font-medium">All properties</span>
            </Link>
          </div>

          {/* Property Info */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{propertyName}</h1>
              {reviews.length > 0 && avgRating !== null && (
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white/10 backdrop-blur px-4 py-2 rounded-full">
                      <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-2xl font-bold ml-2">{avgRating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="text-slate-300">
                    <span className="font-semibold">{reviews.length}</span> guest {reviews.length === 1 ? 'review' : 'reviews'}
                  </div>
                </div>
              )}
            </div>

            {/* Rating Badge */}
            {avgRating !== null && (
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-6 py-4">
                <div className="text-sm text-slate-300 mb-1">Guest Rating</div>
                <div className="text-3xl font-bold">{avgRating.toFixed(1)}<span className="text-xl text-slate-400">/5</span></div>
                <div className="flex gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < Math.round(avgRating) ? 'text-amber-400' : 'text-slate-600'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center mb-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-red-900 mb-2">Unable to Load Reviews</h3>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={loadReviews}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {!error && reviews.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No Reviews Yet</h3>
            <p className="text-slate-600 mb-8">Be the first to share your experience at this property!</p>
            <Link
              href="/listings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Browse Other Properties
            </Link>
          </div>
        )}

        {!error && reviews.length > 0 && (
          <>
            {/* Reviews Section */}
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-8">What Guests Say</h2>

              <div className="space-y-6">
                {reviews.map((review) => (
                  <div
                    key={review.reviewId}
                    className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all"
                  >
                    {/* Review Header with Avatar */}
                    <div className="flex items-start gap-4 mb-6">
                      {/* Avatar */}
                      <div className={`w-14 h-14 rounded-full ${getAvatarColor(review.guestName)} flex items-center justify-center flex-shrink-0 shadow-lg ring-4 ring-white`}>
                        <span className="text-white font-bold text-lg">{getInitials(review.guestName)}</span>
                      </div>

                      {/* Guest Info */}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900">{review.guestName}</h3>
                        <p className="text-slate-500 text-sm mt-1">
                          {new Date(review.submittedAtISO).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      {/* Overall Rating */}
                      {review.overallRating !== null && (
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full">
                          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xl font-bold text-slate-900">{review.overallRating}</span>
                        </div>
                      )}
                    </div>

                    {/* Review Text */}
                    <div className="mb-6">
                      <p className="text-slate-700 text-lg leading-relaxed">
                        "{review.publicReview}"
                      </p>
                    </div>

                    {/* Category Ratings */}
                    {review.categories && review.categories.length > 0 && (
                      <div className="border-t border-slate-100 pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {review.categories.map((category) => (
                            <div
                              key={category.key}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                              <span className="font-medium text-slate-700 text-sm">
                                {category.label}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-900">{category.rating.toFixed(1)}</span>
                                <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Summary Statistics */}
            <section className="bg-white border-2 border-slate-200 rounded-2xl p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Review Highlights</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">{reviews.length}</div>
                  <div className="text-sm text-slate-600 font-medium">Total Reviews</div>
                </div>

                {avgRating !== null && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 mb-1">{avgRating.toFixed(1)}</div>
                    <div className="text-sm text-slate-600 font-medium">Avg Rating</div>
                  </div>
                )}

                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">{reviewsWithRatings.length}</div>
                  <div className="text-sm text-slate-600 font-medium">Rated Reviews</div>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {reviews.filter((r) => r.categories.length > 0).length}
                  </div>
                  <div className="text-sm text-slate-600 font-medium">Detailed Reviews</div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
