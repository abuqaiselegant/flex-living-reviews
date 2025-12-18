#!/bin/bash
set -e

echo "📦 Preparing Lambda deployment package..."

cd "$(dirname "$0")/.."

# Install production dependencies only
echo "Installing production dependencies..."
npm install --production

# Copy necessary files to infra for packaging
echo "Copying files to infra..."
cp -r node_modules infra/ 2>/dev/null || true
cp -r apps infra/ 2>/dev/null || true
cp -r packages infra/ 2>/dev/null || true

echo "✅ Lambda package prepared"
