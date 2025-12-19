# Flex Living Reviews

**Production URL:** [https://flex-living-reviews-web1.vercel.app/](https://flex-living-reviews-web1.vercel.app/)

A modern review management system for vacation rental properties with elegant public review display and intuitive manager approval dashboard.

---

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern UI design

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **PostgreSQL 14.15** - AWS RDS database (eu-west-2)
- **Python FastAPI** - Review data normalizer service

### Infrastructure
- **Vercel** - Deployment platform
- **AWS RDS** - Database hosting
- **GitHub** - Version control and CI/CD

---

## Architecture

```
┌───────────────────────────────────────────────┐
│           Frontend (Next.js 14)               │
│  • Home Page (Hero + Featured Properties)     │
│  • Listings (Browse Properties)               │
│  • Property Details (Approved Reviews)        │
│  • Dashboard (Manager Interface)              │
└───────────────────────────────────────────────┘
                      ↓
┌───────────────────────────────────────────────┐
│           Next.js API Routes                  │
│  • Public APIs (Approved Reviews)             │
│  • Dashboard APIs (All Reviews + Stats)       │
│  • Approval Actions (Approve/Reject)          │
└───────────────────────────────────────────────┘
                      ↓
┌───────────────────────────────────────────────┐
│        PostgreSQL (AWS RDS)                   │
│  • Reviews + Approval Status                  │
│  • Category Ratings                           │
│  • Audit Trail                                │
└───────────────────────────────────────────────┘
```

---

## Key Features

### Public Interface
- Modern responsive design with animated marquee testimonials
- Browse properties with approved review counts
- View detailed reviews with category ratings
- Mobile-optimized with smooth transitions

### Manager Dashboard
- Review approval workflow (approve/reject)
- Real-time approval statistics
- KPI metrics and analytics
- Property performance insights

### Technical Features
- PostgreSQL-only architecture (simplified from dual-database)
- Optimistic UI updates for instant feedback
- No-cache headers for fresh data
- Complete audit trail of all approval actions

---

## API Documentation

### Public Endpoints

#### `GET /api/v1/public/listings`
Returns all listings with approved reviews.

```json
{
  "listings": [{
    "listingId": "listing-101",
    "listingName": "Luxury Downtown Apartment",
    "approvedReviewCount": 3,
    "avgRating": 4.7
  }]
}
```

#### `GET /api/v1/public/listings/[listingId]/reviews`
Returns approved reviews for a specific listing.

```json
{
  "reviews": [{
    "reviewId": "review-1",
    "guestName": "John Smith",
    "overallRating": 5,
    "publicReview": "Amazing stay!",
    "categories": [
      {"key": "cleanliness", "rating": 5}
    ]
  }]
}
```

### Dashboard Endpoints

#### `GET /api/v1/dashboard/listings`
Returns all listings with KPIs and approval statistics.

```json
{
  "listings": [{
    "listingId": "listing-101",
    "kpis": {
      "reviewCount": 3,
      "avgOverallRating": 4.7
    },
    "approvalStats": {
      "approvedCount": 2,
      "pendingCount": 1
    }
  }]
}
```

#### `POST /api/v1/reviews/[reviewId]/approve`
Approve or reject a review.

**Request:**
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
  "isApproved": true,
  "approvedAt": "2024-12-19T10:30:00.000Z"
}
```

---

## Database Schema

### Core Tables

#### `reviews`
Primary review storage with approval status.
- `review_id` (PK) - Unique identifier
- `listing_id` - Property identifier
- `guest_name` - Reviewer name
- `overall_rating` - Overall rating score
- `public_review` - Review text
- `is_approved` - Approval status (NULL/TRUE/FALSE)
- `approved_at` - Approval timestamp
- `approved_by` - Who approved
- `submitted_at` - Submission timestamp

#### `review_categories`
Individual category ratings per review.
- `review_id` (FK) - Links to reviews
- `category_key` - Category identifier
- `rating` - Category rating

#### `review_approvals_audit`
Complete audit trail of approval decisions.
- `review_id` - Review being approved
- `is_approved` - Approval decision
- `approved_at` - Action timestamp
- `actor` - Who performed action

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL client (psql)
- Git

### Installation

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

3. **Configure Environment**
Create `apps/web/.env.local`:
```bash
DATABASE_URL="postgresql://postgres:password@host:5432/flex_living_reviews"
```

4. **Run Development Server**
```bash
npm run dev
```

Access at: [http://localhost:3000](http://localhost:3000)

### Python Normalizer (Optional)
```bash
cd apps/normalizer
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## Design Decisions

### 1. PostgreSQL-Only Architecture
- **Simplified from dual-database** (PostgreSQL + DynamoDB)
- All approval data now stored in PostgreSQL `reviews` table
- Added columns: `is_approved`, `approved_at`, `approved_by`
- **Benefits**: Simpler architecture, no cross-service complexity, easier transactions

### 2. Next.js API Routes
- **Chosen**: Next.js API Routes on Vercel
- **Benefits**: Simplified deployment, TypeScript support, no cold starts
- Deployed as serverless functions on Vercel edge network

### 3. Column Naming Convention
- **Database**: Snake_case (`review_id`, `overall_rating`)
- **API/Frontend**: CamelCase (`reviewId`, `overallRating`)
- **Transform**: SQL aliases (`review_id as "reviewId"`)

### 4. Optimistic UI Updates
- Update local state immediately
- Rollback on API error
- **Benefits**: Instant feedback, better UX

---

## Project Status

**Deployment**: ✅ Live on Vercel  
**Database**: ✅ AWS RDS PostgreSQL (eu-west-2)  
**CI/CD**: ✅ GitHub → Vercel automatic deployment  
**Cost**: $0/month (free tier)

### Available Features
- 3 test properties with sample reviews
- Approval workflow (approve/reject/pending)
- Real-time statistics
- Mobile-responsive design

---

## Contact

- **GitHub**: [abuqaiselegant/flex-living-reviews](https://github.com/abuqaiselegant/flex-living-reviews)
- **Production**: [https://flex-living-reviews-web1.vercel.app/](https://flex-living-reviews-web1.vercel.app/)
- **Branch**: main

---

*Built with Next.js, TypeScript, and AWS*
