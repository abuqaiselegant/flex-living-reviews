# Vercel Deployment Guide (Simpler Approach!)

## What Changed?
We switched from AWS Lambda to **Vercel full-stack deployment** because:
- ✅ No Lambda packaging issues with TypeScript monorepos
- ✅ Simpler deployment (one command)
- ✅ Better Next.js integration
- ✅ Still uses your RDS database (London region)
- ✅ Free tier includes serverless functions

## Your Current Infrastructure
- **RDS PostgreSQL**: Running in London (eu-west-2) - ✅ Working
- **DynamoDB**: Approvals table - ✅ Working  
- **Database**: Schema loaded successfully - ✅ Working
- **Frontend**: Modern Luxe UI ready - ✅ Working
- **API Routes**: Now built as Next.js API routes

## API Endpoints Created
All endpoints moved to Next.js API routes:

```
GET  /api/v1/public/listings
GET  /api/v1/public/listings/[listingId]/reviews
GET  /api/v1/dashboard/listings
GET  /api/v1/dashboard/listings/[listingId]/approvals
POST /api/v1/reviews/[reviewId]/approve
```

## Test Locally

1. **Set AWS Credentials** (for DynamoDB access):
   ```bash
   cd apps/web
   
   # Add your AWS credentials to .env.local
   echo "AWS_ACCESS_KEY_ID=YOUR_KEY" >> .env.local
   echo "AWS_SECRET_ACCESS_KEY=YOUR_SECRET" >> .env.local
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Test API**:
   ```bash
   curl http://localhost:3000/api/v1/public/listings | jq '.'
   ```

## Deploy to Vercel

### Option 1: Via Vercel CLI (Fastest)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   cd apps/web
   vercel
   ```

3. **Set Environment Variables**:
   During deployment, Vercel will prompt for environment variables. Set these:
   
   ```
   DATABASE_URL=postgresql://postgres:FlexLiving2024Secure!@flex-living-reviews-db.czs0s48c4w2u.eu-west-2.rds.amazonaws.com:5432/flex_living_reviews
   AWS_REGION=us-east-1
   APPROVALS_TABLE=flex-living-reviews-dev-approvals
   AWS_ACCESS_KEY_ID=<your-key>
   AWS_SECRET_ACCESS_KEY=<your-secret>
   NEXT_PUBLIC_API_URL=https://your-project.vercel.app
   ```

4. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Via GitHub + Vercel Dashboard

1. **Push to GitHub**:
   ```bash
   # Create .gitignore
   cat > .gitignore << 'EOF'
   node_modules/
   .next/
   .env.local
   .env*.local
   dist/
   build/
   .vercel
   .DS_Store
   *.log
   EOF
   
   # Initialize git and push
   git init
   git add .
   git commit -m "Initial commit - Flex Living Reviews"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Set Root Directory: `apps/web`
   - Add environment variables (same as above)
   - Deploy!

## Cost Summary (Updated)

### Current Monthly Costs:
- **Vercel**: FREE (Hobby plan includes unlimited serverless functions)
- **RDS PostgreSQL db.t3.micro**: FREE for first 12 months (750 hours/month)
- **DynamoDB**: FREE under 25GB storage
- **Total**: $0/month with free tiers, $10-15/month after first year

### Savings vs Lambda Approach:
- No Lambda function costs (Vercel functions included)
- No API Gateway costs (Vercel Edge Network included)
- Simpler infrastructure = easier maintenance

## What About the Lambda Deployment?

You can delete the Lambda resources to avoid any charges:

```bash
cd infra
npx serverless remove --stage dev
```

This will remove:
- All Lambda functions
- API Gateway
- CloudFormation stack

**Keep these:**
- RDS Database (we're using it!)
- DynamoDB table (we're using it!)

## Troubleshooting

### API Returns 500 Error
Check Vercel Function Logs:
```bash
vercel logs
```

### Database Connection Issues
1. Verify RDS security group allows connections from `0.0.0.0/0`
2. Check DATABASE_URL is correct in Vercel environment variables

### DynamoDB Access Issues
1. Verify AWS credentials are set in Vercel environment variables
2. Check IAM user has DynamoDB permissions

## Next Steps

1. ✅ Test locally: `cd apps/web && npm run dev`
2. ✅ Deploy to Vercel: `vercel --prod`
3. ✅ Test production API endpoints
4. ✅ Update frontend to use production API URL
5. 🎉 Your app is LIVE!

## Frontend URLs Update

After deployment, update your frontend to use the Vercel API:

- Local development: `NEXT_PUBLIC_API_URL=http://localhost:3000`
- Production: `NEXT_PUBLIC_API_URL=https://your-app.vercel.app`

The frontend already makes API calls to these endpoints, so it should work seamlessly!
