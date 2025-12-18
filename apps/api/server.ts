import * as dotenv from 'dotenv';
import { resolve } from 'path';
import express from 'express';
import cors from 'cors';
import { handler as reviewsHostawayHandler } from './src/handlers/reviewsHostaway';
import { handler as approveReviewHandler } from './src/handlers/approveReview';
import { handler as publicReviewsHandler } from './src/handlers/publicReviews';
import { handler as publicListingsHandler } from './src/handlers/publicListings';
import { handler as dashboardListingsHandler } from './src/handlers/dashboardListings';
import { handler as listingApprovalsHandler } from './src/handlers/listingApprovals';

// Load environment variables from root .env
dotenv.config({ path: resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Convert Lambda handler to Express middleware
const lambdaToExpress = (handler: any) => {
  return async (req: express.Request, res: express.Response) => {
    try {
      const event = {
        httpMethod: req.method,
        path: req.path,
        pathParameters: req.params,
        queryStringParameters: req.query,
        body: JSON.stringify(req.body),
        headers: req.headers,
        requestContext: {},
      };

      const result = await handler(event, {} as any);
      
      res.status(result.statusCode || 200);
      
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value as string);
        });
      }
      
      res.send(result.body);
    } catch (error) {
      console.error('Handler error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

// Routes
app.get('/v1/reviews/hostaway', lambdaToExpress(reviewsHostawayHandler));
app.post('/v1/reviews/:reviewId/approve', lambdaToExpress(approveReviewHandler));
app.get('/v1/public/listings', lambdaToExpress(publicListingsHandler));
app.get('/v1/public/listings/:listingId/reviews', lambdaToExpress(publicReviewsHandler));
app.get('/v1/dashboard/listings', lambdaToExpress(dashboardListingsHandler));
app.get('/v1/dashboard/listings/:listingId/approvals', lambdaToExpress(listingApprovalsHandler));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

app.listen(PORT, () => {
  console.log(`✅ API Gateway running on http://localhost:${PORT}`);
  console.log(`   GET  /v1/reviews/hostaway`);
  console.log(`   POST /v1/reviews/:reviewId/approve`);
  console.log(`   GET  /v1/public/listings`);
  console.log(`   GET  /v1/public/listings/:listingId/reviews`);
  console.log(`   GET  /v1/dashboard/listings`);
  console.log(`   GET  /v1/dashboard/listings/:listingId/approvals`);
});
