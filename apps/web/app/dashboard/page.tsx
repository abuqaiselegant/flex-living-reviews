'use client';

/**
 * Manager Dashboard Page
 * Displays KPIs, property list, and review approval interface
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchDashboardListings,
  approveReview,
  DashboardListing,
  ApiError,
} from '../../lib/api';
import { NormalizedReview } from '../../lib/types';

// Property images from Unsplash
const propertyImages = [
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop&q=80',
];

type SortOption = 'name' | 'rating' | 'reviewCount';
type ViewMode = 'table' | 'trends' | 'grid';

export default function DashboardPage() {
  const [listings, setListings] = useState<DashboardListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<DashboardListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListing, setSelectedListing] = useState<DashboardListing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [approvalStates, setApprovalStates] = useState<Record<string, boolean>>({});
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minRating, setMinRating] = useState<number | ''>('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSource, setSelectedSource] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('rating');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Apply filters and sorting when data or filters change
  useEffect(() => {
    applyFiltersAndSort();
  }, [listings, dateFrom, dateTo, minRating, selectedCategory, selectedSource, sortBy]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchDashboardListings({ includeApprovals: true });
      setListings(response.listings);
    } catch (err) {
      console.error('Dashboard API failed', err);
      setError(
        err instanceof ApiError
          ? err.message
          : 'Failed to load dashboard data'
      );
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...listings];

    // Filter by date range
    if (dateFrom || dateTo) {
      filtered = filtered.map(listing => ({
        ...listing,
        latestReviews: listing.latestReviews.filter(review => {
          const reviewDate = new Date(review.submittedAtISO);
          if (dateFrom && reviewDate < new Date(dateFrom)) return false;
          if (dateTo && reviewDate > new Date(dateTo)) return false;
          return true;
        })
      }));
    }

    // Filter by min rating
    if (minRating !== '') {
      filtered = filtered.filter(listing => 
        listing.kpis.avgOverallRating !== null && listing.kpis.avgOverallRating >= Number(minRating)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(listing => 
        listing.kpis.avgByCategory[selectedCategory] !== undefined
      );
    }

    // Filter by source
    if (selectedSource !== 'all') {
      filtered = filtered.map(listing => ({
        ...listing,
        latestReviews: listing.latestReviews.filter(review => 
          review.source === selectedSource
        )
      }));
    }

    // Sort listings
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.listingName.localeCompare(b.listingName);
        case 'rating':
          const ratingA = a.kpis.avgOverallRating ?? 0;
          const ratingB = b.kpis.avgOverallRating ?? 0;
          return ratingB - ratingA;
        case 'reviewCount':
          return b.kpis.reviewCount - a.kpis.reviewCount;
        default:
          return 0;
      }
    });

    setFilteredListings(filtered);
  };

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setMinRating('');
    setSelectedCategory('');
    setSelectedSource('all');
    setSortBy('rating');
  };

  const getWorstCategory = (categories: Record<string, number>) => {
    const entries = Object.entries(categories);
    if (entries.length === 0) return null;

    const [key, avgRating] = entries.reduce((worst, current) =>
      current[1] < worst[1] ? current : worst
    );

    return { key, avgRating };
  };

  const getAllCategories = (): string[] => {
    const categoriesSet = new Set<string>();
    listings.forEach(listing => {
      Object.keys(listing.kpis.avgByCategory).forEach(cat => categoriesSet.add(cat));
    });
    return Array.from(categoriesSet).sort();
  };

  const getRecurringIssues = () => {
    const categoryIssues: Record<string, { count: number; avgRating: number; total: number }> = {};
    
    filteredListings.forEach(listing => {
      Object.entries(listing.kpis.avgByCategory).forEach(([key, rating]) => {
        if (rating < 4.0) { // Consider below 4.0 as an issue
          if (!categoryIssues[key]) {
            categoryIssues[key] = { count: 0, avgRating: 0, total: 0 };
          }
          categoryIssues[key].count++;
          categoryIssues[key].total += rating;
        }
      });
    });

    // Calculate averages
    Object.keys(categoryIssues).forEach(key => {
      categoryIssues[key].avgRating = categoryIssues[key].total / categoryIssues[key].count;
    });

    return Object.entries(categoryIssues)
      .map(([key, data]) => ({
        category: key,
        occurrences: data.count,
        avgRating: data.avgRating,
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 5);
  };

  const getTrendData = () => {
    const trends: Record<string, number[]> = {};
    const categories = getAllCategories();
    
    categories.forEach(cat => {
      trends[cat] = filteredListings
        .map(listing => listing.kpis.avgByCategory[cat] || 0)
        .filter(rating => rating > 0);
    });

    return Object.entries(trends)
      .map(([category, ratings]) => ({
        category,
        avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
        count: ratings.length,
      }))
      .sort((a, b) => a.avgRating - b.avgRating);
  };

  const handleBulkApprove = async (reviews: NormalizedReview[], approve: boolean) => {
    let actualChangeCount = 0;
    
    for (const review of reviews) {
      const previousState = approvalStates[review.reviewId];
      
      // Only count as a change if the state is actually changing
      if (previousState !== approve) {
        try {
          await approveReview(review.reviewId, review.listingId, approve);
          setApprovalStates(prev => ({
            ...prev,
            [review.reviewId]: approve,
          }));
          
          // Track actual state changes: +1 if approving from false, -1 if rejecting from true
          actualChangeCount += approve ? 1 : -1;
        } catch (err) {
          console.error('Failed to bulk approve', err);
        }
      }
    }
    
    // Update the listings state based on actual changes
    if (actualChangeCount !== 0 && selectedListing) {
      setListings(prevListings => 
        prevListings.map(listing => {
          if (listing.listingId === selectedListing.listingId && listing.approvalStats) {
            const newApprovedCount = Math.max(0, Math.min(
              listing.approvalStats.totalReviews,
              listing.approvalStats.approvedCount + actualChangeCount
            ));
            // Pending count decreases by the number of items that changed state
            const pendingCountChange = -Math.abs(actualChangeCount);
            const newPendingCount = Math.max(0, listing.approvalStats.pendingCount + pendingCountChange);
            
            return {
              ...listing,
              approvalStats: {
                ...listing.approvalStats,
                approvedCount: newApprovedCount,
                pendingCount: newPendingCount,
              }
            };
          }
          return listing;
        })
      );

      // Update selected listing
      setSelectedListing(prev => {
        if (!prev) return prev;
        const pendingCountChange = -Math.abs(actualChangeCount);
        return {
          ...prev,
          approvalStats: prev.approvalStats ? {
            ...prev.approvalStats,
            approvedCount: Math.max(0, Math.min(
              prev.approvalStats.totalReviews,
              prev.approvalStats.approvedCount + actualChangeCount
            )),
            pendingCount: Math.max(0, prev.approvalStats.pendingCount + pendingCountChange),
          } : prev.approvalStats
        };
      });
    }
  };

  const handlePropertyClick = async (listing: DashboardListing) => {
    setSelectedListing(listing);
    setDrawerOpen(true);

    // Initialize approval states from listing data if available
    const states: Record<string, boolean> = {};
    
    // If we have approval stats from the API, fetch the actual states
    if (listing.approvalStats) {
      // If dashboard was loaded with includeApprovals, we need to fetch fresh approval data
      // For now, we'll make an API call to get the current approval states
      try {
        const response = await fetch(`/api/v1/dashboard/listings/${listing.listingId}/approvals`);
        if (response.ok) {
          const data = await response.json();
          // Check each review's approval status from the response
          listing.latestReviews.forEach((review) => {
            const reviewData = data.reviews?.find((r: any) => r.reviewId === review.reviewId);
            states[review.reviewId] = reviewData?.isApproved || false;
          });
        } else {
          // Fallback: default to false
          listing.latestReviews.forEach((review) => {
            states[review.reviewId] = false;
          });
        }
      } catch (err) {
        console.error('Failed to fetch approval states', err);
        // Fallback: default to false
        listing.latestReviews.forEach((review) => {
          states[review.reviewId] = false;
        });
      }
    } else {
      listing.latestReviews.forEach((review) => {
        states[review.reviewId] = false;
      });
    }
    
    setApprovalStates(states);
  };

  const handleApprovalToggle = async (review: NormalizedReview) => {
    const previousState = approvalStates[review.reviewId];
    const newApprovalState = !previousState;

    // Optimistic update
    setApprovalStates((prev) => ({
      ...prev,
      [review.reviewId]: newApprovalState,
    }));

    try {
      await approveReview(review.reviewId, review.listingId, newApprovalState);
      console.log('Approval updated', {
        reviewId: review.reviewId,
        isApproved: newApprovalState,
      });

      // Calculate the actual change: only increment if going from false to true, decrement if going from true to false
      const approvedCountChange = newApprovalState && !previousState ? 1 : !newApprovalState && previousState ? -1 : 0;
      // Pending count changes only when transitioning from undefined to true/false
      const pendingCountChange = previousState === undefined ? -1 : 0;

      // Update the listings state directly without full reload
      setListings(prevListings => 
        prevListings.map(listing => {
          if (listing.listingId === review.listingId && listing.approvalStats) {
            const newApprovedCount = Math.max(0, Math.min(
              listing.approvalStats.totalReviews,
              listing.approvalStats.approvedCount + approvedCountChange
            ));
            const newPendingCount = Math.max(0, listing.approvalStats.pendingCount + pendingCountChange);
            
            return {
              ...listing,
              approvalStats: {
                ...listing.approvalStats,
                approvedCount: newApprovedCount,
                pendingCount: newPendingCount,
              }
            };
          }
          return listing;
        })
      );

      // Update selected listing if it's the current one
      if (selectedListing?.listingId === review.listingId) {
        setSelectedListing(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            approvalStats: prev.approvalStats ? {
              ...prev.approvalStats,
              approvedCount: Math.max(0, Math.min(
                prev.approvalStats.totalReviews,
                prev.approvalStats.approvedCount + approvedCountChange
              )),
              pendingCount: Math.max(0, prev.approvalStats.pendingCount + pendingCountChange),
            } : prev.approvalStats
          };
        });
      }
    } catch (err) {
      console.error('Failed to update approval', err);
      
      // Revert on error
      setApprovalStates((prev) => ({
        ...prev,
        [review.reviewId]: !newApprovalState,
      }));

      alert(
        err instanceof ApiError
          ? `Failed to update approval: ${err.message}`
          : 'Failed to update approval'
      );
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedListing(null), 300);
  };

  // Calculate overall KPIs from filtered listings
  const totalReviews = filteredListings.reduce((sum, l) => sum + l.kpis.reviewCount, 0);
  const listingsWithRatings = filteredListings.filter((l) => l.kpis.avgOverallRating !== null);
  const avgRating = listingsWithRatings.length > 0
    ? listingsWithRatings.reduce((sum, l) => sum + (l.kpis.avgOverallRating || 0), 0) / listingsWithRatings.length
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 border-t-slate-900 mx-auto"></div>
          <p className="mt-6 text-slate-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={loadDashboardData}
            className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="relative bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/5"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold">Reviews Dashboard</h1>
              </div>
              <p className="text-slate-300 ml-15">Manage and approve property reviews</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg font-medium transition-all border border-white/20"
              >
                ← Back Home
              </Link>
              <div className="relative">
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ViewMode)}
                  className="appearance-none px-4 py-2 pr-10 bg-amber-500 text-white rounded-lg font-medium cursor-pointer shadow-lg hover:bg-amber-600 transition-all focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  <option value="grid">Grid View</option>
                  <option value="table">Table View</option>
                  <option value="trends">Trends & Insights</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-600 mb-1">Total Properties</div>
            <div className="text-3xl font-bold text-slate-900">{filteredListings.length}</div>
            {filteredListings.length !== listings.length && (
              <div className="text-xs text-slate-500 mt-1">of {listings.length} total</div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-600 mb-1">Total Reviews</div>
            <div className="text-3xl font-bold text-slate-900">{totalReviews}</div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-600 mb-1">Average Rating</div>
            <div className="text-3xl font-bold text-slate-900">
              {avgRating !== null ? avgRating.toFixed(2) : 'N/A'}
              {avgRating !== null && <span className="text-lg text-slate-500 ml-1">/ 5.0</span>}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-600 mb-1">Active Filters</div>
            <div className="text-3xl font-bold text-slate-900">
              {[dateFrom, dateTo, minRating, selectedCategory, selectedSource !== 'all'].filter(Boolean).length}
            </div>
            {[dateFrom, dateTo, minRating, selectedCategory, selectedSource !== 'all'].filter(Boolean).length > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-amber-600 hover:text-amber-800 mt-1 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Filters & Sorting</h2>
            </div>
            <button
              onClick={clearFilters}
              className="text-sm text-slate-600 hover:text-slate-900 font-medium px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Min Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Rating
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Any"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {getAllCategories().map(cat => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source/Channel
              </label>
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Sources</option>
                <option value="hostaway">Hostaway</option>
                <option value="google">Google Reviews</option>
                <option value="airbnb">Airbnb</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">Sort By:</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSortBy('name')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'name'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Name
                </button>
                <button
                  onClick={() => setSortBy('rating')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'rating'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  ⭐ Rating
                </button>
                <button
                  onClick={() => setSortBy('reviewCount')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'reviewCount'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📝 Review Count
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Conditional Content: Grid, Table or Trends */}
        {viewMode === 'grid' ? (
          /* Properties Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const issues = Object.entries(listing.kpis.avgByCategory)
                .filter(([_, rating]) => rating < 4.0)
                .sort((a, b) => a[1] - b[1])
                .slice(0, 2);

              return (
                <div
                  key={listing.listingId}
                  className="bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Card Header with Background Image */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={propertyImages[filteredListings.indexOf(listing) % propertyImages.length]}
                      alt={listing.listingName}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>

                    {/* Property Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                      <h3 className="text-lg font-bold mb-1 group-hover:text-amber-400 transition-colors line-clamp-1">
                        {listing.listingName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <p className="text-xs truncate">{listing.listingId}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 text-center border border-slate-200">
                        <div className="flex items-center justify-center mb-1.5 h-4">
                          {listing.kpis.avgOverallRating !== null ? (
                            [...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-3 h-3 ${
                                  i < Math.round(listing.kpis.avgOverallRating || 0)
                                    ? 'text-amber-500'
                                    : 'text-slate-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">N/A</span>
                          )}
                        </div>
                        <p className="text-xl font-bold text-slate-900 leading-none">
                          {listing.kpis.avgOverallRating !== null ? listing.kpis.avgOverallRating.toFixed(1) : '-'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5 font-medium">Rating</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 text-center border border-blue-200">
                        <div className="text-blue-600 mb-1.5 h-4 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </div>
                        <p className="text-xl font-bold text-slate-900 leading-none">{listing.kpis.reviewCount}</p>
                        <p className="text-xs text-slate-500 mt-1.5 font-medium">Reviews</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 text-center border border-green-200">
                        <div className="text-green-600 mb-1.5 h-4 flex items-center justify-center">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-xl font-bold text-slate-900 leading-none">
                          {listing.approvalStats ? Math.round((listing.approvalStats.approvedCount / listing.kpis.reviewCount) * 100) : 0}%
                        </p>
                        <p className="text-xs text-slate-500 mt-1.5 font-medium">Approved</p>
                      </div>
                    </div>

                    {/* Review Progress Bar */}
                    {listing.approvalStats && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">Review Status</span>
                          <span className="text-slate-900 font-semibold">
                            {listing.approvalStats.approvedCount} / {listing.kpis.reviewCount}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(listing.approvalStats.approvedCount / listing.kpis.reviewCount) * 100}%` 
                            }}
                          ></div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            {listing.approvalStats.approvedCount} Approved
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {listing.approvalStats.pendingCount} Pending
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Top Issues - Always show section for consistent layout */}
                    <div className="space-y-1.5 min-h-[60px]">
                      <div className="text-xs font-medium text-slate-600">Top Issues:</div>
                      {issues.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {issues.map(([key, rating]) => (
                            <span
                              key={key}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-orange-50 text-orange-700 border border-orange-200"
                              title={`${key}: ${rating.toFixed(1)}`}
                            >
                              ⚠️ {key.replace(/_/g, ' ').substring(0, 10)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-2 text-xs text-slate-400">
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          No issues - All ratings above 4.0
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => handlePropertyClick(listing)}
                      className="w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-all hover:shadow-lg flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                      </svg>
                      Manage Reviews
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === 'table' ? (
          /* Properties Table */
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Properties ({filteredListings.length})
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Review Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Worst Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Top Issues
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredListings.map((listing) => {
                    const issues = Object.entries(listing.kpis.avgByCategory)
                      .filter(([_, rating]) => rating < 4.0)
                      .sort((a, b) => a[1] - b[1])
                      .slice(0, 2);

                    return (
                      <tr key={listing.listingId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{listing.listingName}</div>
                          <div className="text-xs text-gray-500">{listing.listingId}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {listing.kpis.avgOverallRating !== null ? (
                            <div className="flex items-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${
                                listing.kpis.avgOverallRating >= 4.5 ? 'bg-green-100 text-green-800' :
                                listing.kpis.avgOverallRating >= 4.0 ? 'bg-blue-100 text-blue-800' :
                                listing.kpis.avgOverallRating >= 3.5 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                ⭐ {listing.kpis.avgOverallRating.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No rating</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 font-medium">
                            {listing.kpis.reviewCount}
                          </span>
                          {listing.approvalStats && (
                            <div className="text-xs text-gray-500">
                              {listing.approvalStats.approvedCount} approved
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {listing.kpis.worstCategory ? (
                            <div className="text-sm">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-red-50 text-red-700">
                                {listing.kpis.worstCategory.key.replace(/_/g, ' ')}
                                <span className="ml-1 font-semibold">
                                  {listing.kpis.worstCategory.avgRating.toFixed(1)}
                                </span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {issues.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {issues.map(([key, rating]) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-50 text-orange-700"
                                  title={`${key}: ${rating.toFixed(1)}`}
                                >
                                  ⚠️ {key.replace(/_/g, ' ').substring(0, 10)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-green-600">✓ No issues</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handlePropertyClick(listing)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Manage Reviews →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Trends & Insights View */
          <div className="space-y-6">
            {/* Recurring Issues */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                🔍 Recurring Issues Across Properties
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Categories with ratings below 4.0 stars - requiring attention
              </p>
              
              {getRecurringIssues().length > 0 ? (
                <div className="space-y-3">
                  {getRecurringIssues().map((issue, idx) => (
                    <div key={issue.category} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 capitalize">
                            {issue.category.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-gray-600">
                            Appears in {issue.occurrences} {issue.occurrences === 1 ? 'property' : 'properties'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-red-600">
                          {issue.avgRating.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">avg rating</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🎉</div>
                  <p>No recurring issues found! All categories performing well.</p>
                </div>
              )}
            </div>

            {/* Category Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                📊 Category Performance Overview
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Average ratings by category across all filtered properties
              </p>
              
              <div className="space-y-3">
                {getTrendData().map(trend => {
                  const percentage = (trend.avgRating / 5) * 100;
                  const color = trend.avgRating >= 4.5 ? 'bg-green-500' :
                                trend.avgRating >= 4.0 ? 'bg-blue-500' :
                                trend.avgRating >= 3.5 ? 'bg-yellow-500' : 'bg-red-500';

                  return (
                    <div key={trend.category} className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium text-gray-700 capitalize">
                          {trend.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-gray-900 font-semibold">
                          {trend.avgRating.toFixed(2)} / 5.0
                          <span className="text-gray-500 text-xs ml-1">
                            ({trend.count} properties)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${color} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actionable Insights */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6 border border-blue-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                💡 Actionable Insights
              </h2>
              <ul className="space-y-2 text-sm text-gray-700">
                {getRecurringIssues().length > 0 && (
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>
                      <strong>{getRecurringIssues()[0].category.replace(/_/g, ' ')}</strong> needs immediate attention 
                      - affecting {getRecurringIssues()[0].occurrences} properties with avg rating {getRecurringIssues()[0].avgRating.toFixed(1)}
                    </span>
                  </li>
                )}
                {filteredListings.filter(l => l.kpis.avgOverallRating !== null && l.kpis.avgOverallRating < 4.0).length > 0 && (
                  <li className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <span>
                      {filteredListings.filter(l => l.kpis.avgOverallRating !== null && l.kpis.avgOverallRating < 4.0).length} 
                      {' properties have overall ratings below 4.0 - consider reaching out to improve guest satisfaction'}
                    </span>
                  </li>
                )}
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>
                    Best performing category: <strong>{getTrendData()[getTrendData().length - 1]?.category.replace(/_/g, ' ')}</strong> 
                    {' with '}{getTrendData()[getTrendData().length - 1]?.avgRating.toFixed(2)} average rating
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Review Drawer - Enhanced */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeDrawer}
          ></div>

          {/* Drawer */}
          <div className="absolute inset-y-0 right-0 max-w-3xl w-full bg-white shadow-xl flex flex-col">
            {/* Drawer Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedListing?.listingName}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedListing?.kpis.reviewCount} total reviews
                    {selectedListing?.approvalStats && (
                      <span className="ml-2 text-green-600">
                        • {selectedListing.approvalStats.approvedCount} approved
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={closeDrawer}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-bold"
                >
                  ×
                </button>
              </div>

              {/* Bulk Actions */}
              {selectedListing && selectedListing.latestReviews.length > 0 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBulkApprove(selectedListing.latestReviews, true)}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    ✓ Approve All
                  </button>
                  <button
                    onClick={() => handleBulkApprove(selectedListing.latestReviews, false)}
                    className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    ✗ Reject All
                  </button>
                  <span className="text-xs text-gray-600 ml-2">
                    Bulk actions will process all reviews below
                  </span>
                </div>
              )}
            </div>

            {/* Category Summary */}
            {selectedListing && Object.keys(selectedListing.kpis.avgByCategory).length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="text-xs font-medium text-gray-600 mb-2">Category Performance</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedListing.kpis.avgByCategory).map(([key, rating]) => (
                    <span
                      key={key}
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        rating >= 4.5 ? 'bg-green-100 text-green-800' :
                        rating >= 4.0 ? 'bg-blue-100 text-blue-800' :
                        rating >= 3.5 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      {key.replace(/_/g, ' ')}: {rating.toFixed(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedListing?.latestReviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-5xl mb-3">📝</div>
                  <p className="text-gray-500">No reviews available for this property</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedListing?.latestReviews.map((review) => {
                    const isApproved = approvalStates[review.reviewId] || false;
                    return (
                    <div
                      key={review.reviewId}
                      className={`border-2 rounded-lg p-5 transition-all duration-300 ${
                        isApproved 
                          ? 'border-green-400 bg-green-50 shadow-md' 
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }`}
                    >
                      {/* Review Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <div className="font-medium text-gray-900">{review.guestName}</div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              {review.source}
                            </span>
                            {isApproved && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-600 text-white">
                                ✓ APPROVED
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(review.submittedAtISO).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                        {review.overallRating !== null && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold bg-yellow-100 text-yellow-800">
                            ⭐ {review.overallRating}
                          </span>
                        )}
                      </div>

                      {/* Review Text */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700 leading-relaxed">{review.publicReview}</p>
                      </div>

                      {/* Categories */}
                      {review.categories.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-600 mb-2">Ratings by Category</div>
                          <div className="grid grid-cols-2 gap-2">
                            {review.categories.map((cat) => (
                              <div
                                key={cat.key}
                                className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded"
                              >
                                <span className="text-xs text-gray-700 capitalize">
                                  {cat.label}
                                </span>
                                <span className={`text-xs font-bold ${
                                  cat.rating >= 4.5 ? 'text-green-600' :
                                  cat.rating >= 4.0 ? 'text-blue-600' :
                                  cat.rating >= 3.5 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {cat.rating.toFixed(1)} ★
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Approval Toggle */}
                      <div className={`flex items-center justify-between pt-4 border-t-2 ${
                        isApproved ? 'border-green-300' : 'border-gray-200'
                      }`}>
                        <div>
                          <span className="text-sm font-semibold text-gray-700">
                            Display on Public Website
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {isApproved
                              ? '✓ This review is visible to potential guests' 
                              : '⏸ This review is hidden from the public'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={approvalStates[review.reviewId] || false}
                            onChange={() => handleApprovalToggle(review)}
                          />
                          <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
                          <span className="ml-3 text-sm font-bold">
                            {isApproved ? (
                              <span className="text-green-600">✓ Approved</span>
                            ) : (
                              <span className="text-gray-500">⏸ Pending</span>
                            )}
                          </span>
                        </label>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {selectedListing?.latestReviews.filter(r => approvalStates[r.reviewId]).length || 0} of{' '}
                  {selectedListing?.latestReviews.length || 0} reviews approved
                </span>
                <button
                  onClick={closeDrawer}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
