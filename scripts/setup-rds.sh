#!/bin/bash
set -e

echo "🗄️  Setting up RDS PostgreSQL database"
echo "======================================"

# Get database endpoint from user
read -p "Enter RDS endpoint (e.g., mydb.123456.us-east-1.rds.amazonaws.com): " DB_HOST
read -p "Enter database name [flex_living_reviews]: " DB_NAME
DB_NAME=${DB_NAME:-flex_living_reviews}
read -p "Enter master username [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}
read -sp "Enter master password: " DB_PASSWORD
echo ""

# Construct DATABASE_URL
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:5432/$DB_NAME"

echo ""
echo "🔗 Testing database connection..."
if psql "$DATABASE_URL" -c "SELECT version();" &> /dev/null; then
    echo "✅ Database connection successful!"
else
    echo "❌ Failed to connect to database. Please check credentials."
    exit 1
fi

echo ""
echo "📝 Running database schema..."
psql "$DATABASE_URL" < apps/api/src/db/schema.sql

echo ""
echo "✅ Database setup complete!"
echo ""
echo "📋 Add this to your .env file:"
echo "DATABASE_URL=$DATABASE_URL"
echo ""
echo "💡 Update Lambda environment variables:"
echo "   STAGE=dev  # or prod"
echo "   aws lambda update-function-configuration \\"
echo "     --function-name flex-living-reviews-\$STAGE-reviewsHostaway \\"
echo "     --environment Variables=\"{DATABASE_URL=$DATABASE_URL,APPROVALS_TABLE=flex-living-reviews-\$STAGE-approvals}\""
