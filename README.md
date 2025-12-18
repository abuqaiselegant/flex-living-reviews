# Flex Living Reviews - Documentation

**Production URL:** [https://flex-living-reviews-web1.vercel.app/](https://flex-living-reviews-web1.vercel.app/)

A modern review management system for vacation rental properties with public review display and manager approval dashboard.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Key Features](#key-features)
4. [API Documentation](#api-documentation)
5. [Design Decisions](#design-decisions)
6. [Local Setup](#local-setup)
7. [Database Schema](#database-schema)
8. [Google Reviews Findings](#google-reviews-findings)

---

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router for server-side rendering and API routes
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework for modern UI design
- **Framer Motion** - Smooth animations and transitions

### Backend
- **Next.js API Routes** - Serverless API endpoints deployed on Vercel
- **PostgreSQL 14.15** - AWS RDS database for review storage
- **DynamoDB** - AWS NoSQL database for approval state management
- **Python FastAPI** - Normalizer service for review data transformation (port 8000)

### Infrastructure
- **Vercel** - Full-stack deployment platform (us-east-1 region)
- **AWS RDS** - PostgreSQL database (eu-west-2 London region)
- **AWS DynamoDB** - Approval state storage (us-east-1 region)
- **GitHub** - Version control and CI/CD integration

### Development Tools
- **Node.js 18+** - JavaScript runtime
- **npm** - Package management
- **Git** - Version control

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  Next.js 14 App (Public Pages + Manager Dashboard)          │
│  - Home: Hero with marquee testimonials                     │
│  - Listings: Browse properties with approved reviews         │
│  - Property Details: View all approved reviews              │
│  - Dashboard: Manager review approval interface             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                        │
│  /api/v1/public/listings        - Public listings           │
│  /api/v1/public/listings/[id]/reviews - Approved reviews    │
│  /api/v1/dashboard/listings     - Dashboard data + stats    │
│  /api/v1/dashboard/listings/[id]/approvals - Review states  │
│  /api/v1/reviews/[id]/approve   - Approve/reject action     │
└─────────────────────────────────────────────────────────────┘
                    ↓                           ↓
         ┌──────────────────┐        ┌──────────────────┐
         │   PostgreSQL     │        │    DynamoDB      │
         │   (AWS RDS)      │        │  (Approvals)     │
         │                  │        │                  │
         │  - reviews       │        │  {listingId:     │
         │  - categories    │        │   {reviewId:     │
         │  - audit_trail   │        │    boolean}}     │
         └──────────────────┘        └──────────────────┘
```

---

## Key Features

### Public Interface
- **Modern Luxe UI**: Contemporary design with animated marquee testimonials
- **Property Listings**: Browse all properties with approved review counts
- **Review Display**: View detailed approved reviews with category ratings
- **Responsive Design**: Mobile-friendly interface with smooth animations

### Manager Dashboard
- **Approval Workflow**: Review, approve, or reject guest reviews
- **Real-time Stats**: Live approval statistics (approved/pending/rejected)
- **Bulk Actions**: Approve/reject multiple reviews at once
- **KPI Metrics**: Average ratings, review counts, category breakdowns
- **Filtering**: Filter by date, rating, category, and source
- **Search & Sort**: Find specific listings quickly

### Technical Features
- **Optimistic Updates**: Instant UI feedback before server confirmation
- **No-cache API**: Fresh data on every page refresh
- **Audit Trail**: Complete history of approval decisions in PostgreSQL
- **State Management**: Efficient approval state storage in DynamoDB

---

## API Documentation

### Public Endpoints

#### `GET /api/v1/public/listings`
Returns all listings with at least one approved review.

**Response:**
```json
{
  "listings": [
    {
      "listingId": "listing-101",
      "listingName": "Luxury Downtown Apartment",
      "approvedReviewCount": 3,
      "avgRating": 4.7
    }
  ],
  "total": 3
}
```

#### `GET /api/v1/public/listings/[listingId]/reviews`
Returns all approved reviews for a specific listing.

**Response:**
```json
{
  "listingId": "listing-101",
  "reviews": [
    {
      "reviewId": "review-1",
      "guestName": "John Smith",
      "overallRating": 5,
      "publicReview": "Amazing stay!",
      "submittedAtISO": "2024-12-01T00:00:00.000Z",
      "categories": [
        {"key": "cleanliness", "label": "Cleanliness", "rating": 5}
      ]
    }
  ]
}
```

### Dashboard Endpoints

#### `GET /api/v1/dashboard/listings?includeApprovals=true`
Returns all listings with KPIs and approval statistics.

**Response:**
```json
{
  "listings": [
    {
      "listingId": "listing-101",
      "listingName": "Luxury Downtown Apartment",
      "kpis": {
        "reviewCount": 3,
        "avgOverallRating": 4.7,
        "avgByCategory": {"cleanliness": 4.8},
        "worstCategory": {"key": "location", "avgRating": 4.5}
      },
      "approvalStats": {
        "totalReviews": 3,
        "approvedCount": 2,
        "pendingCount": 1
      },
      "latestReviews": [...]
    }
  ]
}
```

#### `POST /api/v1/reviews/[reviewId]/approve`
Approve or reject a review.

**Request Body:**
```json
{
  "listingId": "listing-101",
  "isApproved": true
}
```

**Response:**
```json
{
  "ok": true,
  "reviewId": "review-1",
  "listingId": "listing-101",
  "isApproved": true,
  "approvedAt": "2024-12-18T10:30:00.000Z"
}
```

### API Behaviors

- **Cache Control**: All API responses include no-cache headers to prevent stale data
- **Error Handling**: Comprehensive error responses with HTTP status codes
- **Validation**: Request body validation with clear error messages
- **Audit Logging**: All approval actions logged to `review_approvals_audit` table
- **Optimistic UI**: Frontend updates immediately, with rollback on API failure

---

## Design Decisions

### 1. **Dual Database Architecture**
- **PostgreSQL for Reviews**: Relational structure for complex queries, joins, and aggregations
- **DynamoDB for Approvals**: Fast key-value lookups for approval state (listingId → {reviewId: boolean})
- **Rationale**: PostgreSQL provides powerful analytics while DynamoDB offers low-latency state management

### 2. **Next.js API Routes vs. Lambda**
- **Chosen**: Next.js API Routes deployed on Vercel
- **Alternative Considered**: AWS Lambda with API Gateway
- **Rationale**: Simplified deployment, built-in TypeScript support, easier monorepo management, no cold starts

### 3. **Approval State Storage**
- **Structure**: `{listingId: {approvals: {reviewId: boolean}}}`
- **Rationale**: Single-item per listing enables atomic updates and efficient batch reads
- **Trade-off**: No built-in history (solved by separate audit table in PostgreSQL)

### 4. **Column Naming Convention**
- **Database**: Snake_case (`review_id`, `overall_rating`, `public_review`)
- **API/Frontend**: CamelCase (`reviewId`, `overallRating`, `publicReview`)
- **Implementation**: SQL aliases for transformation (`review_id as "reviewId"`)

### 5. **Optimistic UI Updates**
- **Pattern**: Update local state immediately, rollback on error
- **Benefits**: Instant feedback, perceived performance
- **Implementation**: React state management with error handling

### 6. **Categories as Separate Table**
- **Schema**: One row per category rating (review_id, category_key, rating)
- **Rationale**: Flexible category structure, efficient aggregation queries
- **Usage**: JSON aggregation for API responses

### 7. **Type Safety**
- **Shared Types**: Consolidated in `apps/web/lib/types.ts`
- **Consistency**: Same types used across frontend and API routes
- **Benefit**: Compile-time error detection, better IDE support

---

## Local Setup

### Prerequisites
```bash
Node.js 18+
PostgreSQL client (psql)
AWS CLI configured
Git
```

### Installation Steps

1. **Clone Repository**
```bash
git clone https://github.com/abuqaiselegant/flex-living-reviews.git
cd flex-living-reviews
```

2. **Install Dependencies**
```bash
cd apps/web
npm install
```

3. **Configure Environment Variables**
Create `apps/web/.env.local`:
```bash
# Database
DATABASE_URL="postgresql://postgres:password@host:5432/flex_living_reviews"

# AWS Credentials
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
APPROVALS_TABLE="flex-living-reviews-dev-approvals"
```

4. **Initialize Database** (if needed)
```bash
# Connect to PostgreSQL
psql -h your-host -U postgres -d flex_living_reviews

# Run schema (from old backup location or recreate from production)
# Schema includes: reviews, review_categories, review_approvals_audit tables
# Plus views: listing_kpis, review_latest_approval, approved_reviews
```

5. **Run Development Server**
```bash
cd apps/web
npm run dev
```

Access at: [http://localhost:3000](http://localhost:3000)

### Python Normalizer Service (Optional)
```bash
cd apps/normalizer
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Database Schema

### Core Tables

#### `reviews`
Primary review storage with normalized data from multiple sources.
```sql
- review_id (PK)          - Unique identifier
- listing_id              - Property identifier
- listing_name            - Property name
- guest_name              - Reviewer name
- overall_rating          - Overall rating score
- public_review           - Review text
- submitted_at            - Submission timestamp
- source                  - Review source (hostaway)
- type, status            - Review metadata
```

#### `review_categories`
Individual category ratings per review.
```sql
- review_id (FK)          - Links to reviews
- category_key            - Category identifier
- category_label          - Display name
- rating                  - Category rating
```

#### `review_approvals_audit`
Complete audit trail of approval decisions.
```sql
- id (PK)                 - Auto-increment
- review_id               - Review being approved
- listing_id              - Associated listing
- is_approved             - true/false
- approved_at             - Action timestamp
- actor                   - Who performed action
- notes                   - Optional notes
```

### Views

#### `listing_kpis`
Aggregated metrics per listing for quick access.
```sql
SELECT listing_id, listing_name,
       COUNT(*) as total_reviews,
       AVG(overall_rating) as avg_rating
FROM reviews
GROUP BY listing_id, listing_name
```

#### `review_latest_approval`
Most recent approval decision per review.
```sql
SELECT DISTINCT ON (review_id) *
FROM review_approvals_audit
ORDER BY review_id, approved_at DESC
```

---

## Google Reviews Findings

### Investigation Summary
During the project planning phase, we evaluated integrating Google Reviews as an additional review source alongside Hostaway.

### Key Findings

1. **API Access Requirements**
   - Google My Business API requires verified business ownership
   - OAuth 2.0 authentication with specific business account access
   - Limited to businesses with claimed Google My Business listings

2. **Data Structure**
   - Google Reviews provide: rating, text, reviewer name, timestamp
   - No category-level ratings (unlike Hostaway's detailed breakdown)
   - Reviews tied to specific business locations

3. **Rate Limits & Costs**
   - Google My Business API: Free tier with reasonable limits
   - Rate limits: 500 requests per day per project
   - Requires Google Cloud Project setup

4. **Technical Challenges**
   - Multiple properties → multiple business listings → complex OAuth setup
   - No standardized category ratings for comparison with Hostaway
   - Different review schemas require significant normalization logic

5. **Decision: Not Implemented**
   - **Reason**: Focused on Hostaway integration for MVP
   - **Future Consideration**: Google Reviews can be added as additional source
   - **Implementation Path**: Would require:
     - Google Cloud Project setup
     - OAuth flow for property managers
     - Additional normalizer logic for schema mapping
     - UI updates to display multiple sources

### Recommendation
For production deployment with Google Reviews:
1. Set up Google Cloud Project
2. Implement OAuth authentication flow
3. Create separate normalizer endpoint for Google Reviews
4. Update database schema to handle multiple sources efficiently
5. Add source filtering in manager dashboard

---

## Project Status

**Deployment**: ✅ Live on Vercel  
**Database**: ✅ AWS RDS PostgreSQL (eu-west-2)  
**Approvals**: ✅ AWS DynamoDB (us-east-1)  
**CI/CD**: ✅ GitHub → Vercel automatic deployment  
**Cost**: $0/month (all services on free tier)

### Test Data Available
- 3 properties (listings)
- 8 sample reviews across properties
- Mix of approved, rejected, and pending states

---

## Contact & Repository

- **GitHub**: [abuqaiselegant/flex-living-reviews](https://github.com/abuqaiselegant/flex-living-reviews)
- **Production**: [https://flex-living-reviews-web1.vercel.app/](https://flex-living-reviews-web1.vercel.app/)
- **Branch**: main
- **Last Updated**: December 18, 2025

---

*Built with ❤️ using Next.js, TypeScript, and AWS*
