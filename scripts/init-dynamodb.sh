#!/bin/bash

# Initialize DynamoDB Local with ReviewApprovals table

echo "⏳ Waiting for DynamoDB Local to be ready..."
sleep 5

# Check if table already exists
TABLE_EXISTS=$(aws dynamodb list-tables \
  --endpoint-url http://localhost:8001 \
  --region eu-west-2 \
  --query "TableNames[?@=='ReviewApprovals']" \
  --output text 2>/dev/null)

if [ -n "$TABLE_EXISTS" ]; then
  echo "✅ ReviewApprovals table already exists"
  exit 0
fi

echo "📦 Creating ReviewApprovals table..."

aws dynamodb create-table \
  --endpoint-url http://localhost:8001 \
  --region eu-west-2 \
  --table-name ReviewApprovals \
  --attribute-definitions \
    AttributeName=listingId,AttributeType=S \
    AttributeName=reviewId,AttributeType=S \
  --key-schema \
    AttributeName=listingId,KeyType=HASH \
    AttributeName=reviewId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

echo "✅ ReviewApprovals table created successfully"
