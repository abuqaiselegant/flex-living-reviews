// Central Lambda handler exports
const { handler: reviewsHostaway } = require('../apps/api/src/handlers/reviewsHostaway');
const { handler: approveReview } = require('../apps/api/src/handlers/approveReview');
const { handler: publicReviews } = require('../apps/api/src/handlers/publicReviews');
const { handler: publicListings } = require('../apps/api/src/handlers/publicListings');
const { handler: dashboardListings } = require('../apps/api/src/handlers/dashboardListings');
const { handler: listingApprovals } = require('../apps/api/src/handlers/listingApprovals');

module.exports = {
  reviewsHostaway,
  approveReview,
  publicReviews,
  publicListings,
  dashboardListings,
  listingApprovals
};
