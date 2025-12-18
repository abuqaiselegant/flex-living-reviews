Goal: Build Flex Living Reviews Dashboard (assessment).
Stack: Next.js (React+TS) frontend, AWS API Gateway + Lambda (Node.js TS) backend, DynamoDB for review approvals, PostgreSQL for normalized reviews and analytics, FastAPI microservice for normalization + simple issue tagging.

Must-have API:
GET /v1/reviews/hostaway -> loads mock Hostaway response, calls FastAPI /normalize/hostaway, upserts into Postgres, returns grouped normalized payload by listing.

Approvals:
POST /v1/reviews/{reviewId}/approve { listingId, isApproved } -> write to DynamoDB + Postgres audit.

Public:
GET /v1/public/listings/{listingId}/reviews -> only approved reviews.

Normalization rules:
- reviewId = "hostaway:{id}"
- listingId = slug(listingName)
- overallRating = rating if not null else avg(reviewCategory[].rating) else null
- submittedAt parse "YYYY-MM-DD HH:mm:ss" to ISO
- categories keep key + label
