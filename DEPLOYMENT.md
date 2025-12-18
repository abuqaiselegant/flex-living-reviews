# 🚀 AWS Lambda + Vercel Deployment Guide

## 📋 Prerequisites

1. **AWS Account** with $100 free tier credits
2. **AWS CLI** installed and configured
3. **Node.js 20+** installed
4. **Python 3.11** installed
5. **Vercel Account** (free tier)

---

## 🎯 Deployment Steps

### Step 1: Configure AWS Credentials

```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Region: us-east-1 (or your preferred region)
# Output format: json
```

**Verify credentials:**
```bash
aws sts get-caller-identity
```

---

### Step 2: Create RDS PostgreSQL Database

**Option A: Using AWS Console (Recommended)**

1. Go to AWS RDS Console
2. Click "Create database"
3. Choose:
   - **Engine**: PostgreSQL 14
   - **Templates**: Free tier
   - **DB instance**: db.t3.micro (750 hours/month free)
   - **DB name**: `flex_living_reviews`
   - **Master username**: `postgres`
   - **Master password**: (your choice)
4. **Public access**: Yes (for now, restrict later)
5. **VPC security group**: Create new, allow PostgreSQL (5432) from your IP
6. Click "Create database"
7. Wait 5-10 minutes for database to be available

**Option B: Using AWS CLI**

```bash
aws rds create-db-instance \
  --db-instance-identifier flex-living-reviews-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.7 \
  --master-username postgres \
  --master-user-password YourSecurePassword123 \
  --allocated-storage 20 \
  --publicly-accessible \
  --backup-retention-period 7
```

**Get database endpoint:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier flex-living-reviews-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

---

### Step 3: Setup Database Schema

```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:YourPassword@your-db-endpoint.rds.amazonaws.com:5432/flex_living_reviews"

# Or use the script
./scripts/setup-rds.sh
```

---

### Step 4: Deploy Backend to AWS Lambda

```bash
# Deploy to dev environment
./scripts/deploy-aws.sh dev

# Or deploy to production
./scripts/deploy-aws.sh prod
```

**What this does:**
- ✅ Builds FastAPI normalizer with Mangum adapter
- ✅ Packages all Lambda functions
- ✅ Creates DynamoDB table for approvals
- ✅ Deploys API Gateway with all endpoints
- ✅ Sets up IAM roles and permissions

**Expected output:**
```
✅ Deployment complete!
==============================================
📡 API Gateway URL: https://abc123xyz.execute-api.us-east-1.amazonaws.com

📋 Next steps:
  1. Setup RDS PostgreSQL database ✓
  2. Run schema ✓
  3. Update DATABASE_URL environment variable
  4. Test API
  5. Deploy frontend to Vercel
```

---

### Step 5: Update Lambda Environment Variables

```bash
# Set your stage (dev or prod)
STAGE=dev

# Set your DATABASE_URL
DATABASE_URL="postgresql://postgres:password@your-db.rds.amazonaws.com:5432/flex_living_reviews"

# Update all Lambda functions
for FUNC in reviewsHostaway approveReview publicReviews publicListings dashboardListings listingApprovals; do
  aws lambda update-function-configuration \
    --function-name flex-living-reviews-$STAGE-$FUNC \
    --environment "Variables={DATABASE_URL=$DATABASE_URL,APPROVALS_TABLE=flex-living-reviews-$STAGE-approvals}"
done
```

---

### Step 6: Test Your API

```bash
# Get your API URL
API_URL=$(cd infra && npx serverless info --stage dev | grep "endpoint:" | awk '{print $2}')

# Test health endpoint
curl $API_URL/health

# Test normalizer
curl $API_URL/normalize/hostaway

# Test public listings
curl $API_URL/v1/public/listings
```

---

### Step 7: Deploy Frontend to Vercel

```bash
./scripts/deploy-vercel.sh

# Or manually:
cd apps/web
vercel --prod
```

**During Vercel deployment:**
1. Link to existing project or create new
2. Set environment variable: `NEXT_PUBLIC_API_URL` = your API Gateway URL
3. Deploy

**Your app is now live! 🎉**

---

## 💰 Cost Breakdown

### Free Tier (First 12 Months)
- **Lambda**: 1M requests/month FREE
- **API Gateway**: 1M requests/month FREE
- **DynamoDB**: 25GB + 25 WCU/RCU FREE
- **RDS db.t3.micro**: 750 hours/month FREE
- **Vercel**: 100GB bandwidth FREE

### Estimated Monthly Cost
- **Months 1-12**: $1-3/month (CloudWatch logs only)
- **After 12 months**: $15-20/month (RDS charges kick in)
- **With $100 credit**: FREE for 33+ months!

---

## 🛑 How to Stop/Delete Everything

### Stop RDS (to avoid charges)
```bash
aws rds stop-db-instance --db-instance-identifier flex-living-reviews-db
```

### Delete Everything
```bash
# Remove Lambda + API Gateway + DynamoDB
cd infra
serverless remove --stage dev

# Delete RDS database
aws rds delete-db-instance \
  --db-instance-identifier flex-living-reviews-db \
  --skip-final-snapshot

# Delete Vercel deployment
vercel remove
```

---

## 🔧 Troubleshooting

### Lambda Timeout Errors
- Increase timeout in serverless.yml
- Check RDS security group allows Lambda connections

### Database Connection Errors
- Verify RDS is publicly accessible
- Check security group allows connections from 0.0.0.0/0
- Consider using VPC for production

### CORS Errors
- Verify CORS configuration in serverless.yml
- Check Vercel environment variables

---

## 📚 Useful Commands

```bash
# View Lambda logs
aws logs tail /aws/lambda/flex-living-reviews-dev-reviewsHostaway --follow

# Invoke Lambda directly
aws lambda invoke --function-name flex-living-reviews-dev-publicListings output.json

# Check DynamoDB table
aws dynamodb describe-table --table-name flex-living-reviews-dev-approvals

# List all Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `flex-living-reviews`)].FunctionName'
```

---

## 🎉 You're Done!

Your application is now running on:
- **Backend**: AWS Lambda (serverless, auto-scaling)
- **Database**: RDS PostgreSQL (managed, automated backups)
- **Approvals**: DynamoDB (NoSQL, millisecond latency)
- **Frontend**: Vercel (CDN, automatic HTTPS)

**Total cost with free tier**: ~$1-3/month for the first year! 🚀
