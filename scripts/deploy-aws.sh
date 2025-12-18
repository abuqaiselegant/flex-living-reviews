#!/bin/bash
set -e

echo "🚀 Deploying Flex Living Reviews to AWS Lambda"
echo "=============================================="

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured!"
    echo "Please run: aws configure"
    exit 1
fi

# Get deployment stage (default: dev)
STAGE=${1:-dev}
echo "📍 Deploying to stage: $STAGE"

# Check environment variables
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Warning: DATABASE_URL not set. Make sure to configure RDS after deployment."
fi

# Step 1: Build FastAPI normalizer
echo ""
echo "1️⃣  Building FastAPI normalizer..."
./scripts/build-normalizer.sh

# Step 2: Install serverless dependencies
echo ""
echo "2️⃣  Installing serverless dependencies..."
cd infra
npm install

# Step 3: Deploy to AWS
echo ""
echo "3️⃣  Deploying to AWS Lambda..."
npx serverless deploy --stage $STAGE

# Step 4: Get API URL
echo ""
echo "4️⃣  Retrieving API Gateway URL..."
API_URL=$(npx serverless info --stage $STAGE | grep "endpoint:" | awk '{print $2}')

echo ""
echo "✅ Deployment complete!"
echo "=============================================="
echo "📡 API Gateway URL: $API_URL"
echo ""
echo "📋 Next steps:"
echo "  1. Setup RDS PostgreSQL database"
echo "  2. Run schema: psql \$DATABASE_URL < apps/api/src/db/schema.sql"
echo "  3. Update DATABASE_URL environment variable"
echo "  4. Test API: curl $API_URL/health"
echo "  5. Deploy frontend to Vercel with API_URL"
echo ""
echo "💡 To update environment variables:"
echo "   aws lambda update-function-configuration --function-name flex-living-reviews-$STAGE-reviewsHostaway --environment Variables='{DATABASE_URL=your-rds-url}'"
