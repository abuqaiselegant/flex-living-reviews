#!/bin/bash

# Deployment Script for Flex Living Reviews
# Run this script to push to GitHub and deploy to Vercel

set -e

echo "🚀 Deploying Flex Living Reviews to Vercel"
echo "=========================================="
echo ""

# Step 1: Initialize Git
echo "📦 Step 1: Initializing Git repository..."
if [ ! -d .git ]; then
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git already initialized"
fi

# Step 2: Add files
echo ""
echo "📝 Step 2: Adding files to git..."
git add .
git status --short

# Step 3: Commit
echo ""
echo "💾 Step 3: Creating commit..."
read -p "Enter commit message (default: 'Initial commit'): " commit_msg
commit_msg=${commit_msg:-"Initial commit: Flex Living Reviews"}
git commit -m "$commit_msg" || echo "No changes to commit"

# Step 4: GitHub
echo ""
echo "🌐 Step 4: Push to GitHub"
echo "First, create a repository on GitHub, then enter the URL below:"
read -p "GitHub repository URL (e.g., https://github.com/username/repo.git): " repo_url

if [ ! -z "$repo_url" ]; then
    git branch -M main
    git remote add origin "$repo_url" 2>/dev/null || git remote set-url origin "$repo_url"
    echo "Pushing to GitHub..."
    git push -u origin main
    echo "✅ Pushed to GitHub"
else
    echo "⚠️  Skipping GitHub push. You can do this manually later."
fi

# Step 5: Vercel
echo ""
echo "🚀 Step 5: Deploy to Vercel"
echo ""
echo "Choose deployment method:"
echo "1) Vercel Dashboard (Recommended - easier environment variable setup)"
echo "2) Vercel CLI"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo "📋 Follow these steps:"
    echo "1. Go to https://vercel.com/new"
    echo "2. Import your GitHub repository"
    echo "3. Set Root Directory: apps/web"
    echo "4. Add these environment variables:"
    echo ""
    echo "   DATABASE_URL=postgresql://postgres:FlexLiving2024Secure!@flex-living-reviews-db.czs0s48c4w2u.eu-west-2.rds.amazonaws.com:5432/flex_living_reviews"
    echo "   AWS_REGION=us-east-1"
    echo "   APPROVALS_TABLE=flex-living-reviews-dev-approvals"
    echo "   AWS_ACCESS_KEY_ID=AKIA2O4HRWAFZOGRBVKX"
    echo "   AWS_SECRET_ACCESS_KEY=<get from ~/.aws/credentials>"
    echo "   NEXT_PUBLIC_API_URL=https://YOUR_PROJECT.vercel.app"
    echo ""
    echo "5. Click Deploy!"
    echo ""
    echo "After deployment, remember to update NEXT_PUBLIC_API_URL with your actual Vercel URL"
    
elif [ "$choice" = "2" ]; then
    echo ""
    echo "Installing Vercel CLI..."
    npm install -g vercel
    
    echo ""
    echo "Deploying to Vercel..."
    cd apps/web
    vercel
    
    echo ""
    echo "✅ Deployed! Now deploy to production:"
    echo "   cd apps/web && vercel --prod"
else
    echo "Invalid choice. Please run the script again."
    exit 1
fi

echo ""
echo "🎉 Deployment process complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test your API endpoints"
echo "2. Update NEXT_PUBLIC_API_URL if needed"
echo "3. Optionally cleanup old Lambda deployment: cd infra && npx serverless remove --stage dev"
echo ""
echo "Your app should be live at: https://your-project.vercel.app"
