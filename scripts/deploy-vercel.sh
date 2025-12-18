#!/bin/bash
set -e

echo "🌐 Deploying Next.js frontend to Vercel"
echo "======================================="

cd apps/web

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Get API Gateway URL
read -p "Enter your AWS API Gateway URL (from deployment): " API_URL

# Set environment variables
echo ""
echo "⚙️  Setting environment variables..."
vercel env add NEXT_PUBLIC_API_URL production <<< "$API_URL"

# Deploy to Vercel
echo ""
echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Frontend deployment complete!"
echo ""
echo "📋 Your app is now live!"
echo "   Frontend: Check Vercel dashboard for URL"
echo "   Backend: $API_URL"
