#!/bin/bash
set -e

echo "📦 Building FastAPI normalizer for Lambda deployment..."

cd apps/normalizer

# Create temp directory for build
rm -rf build
mkdir -p build

# Install dependencies
pip install -r requirements.txt -t build/

# Copy application files
cp main.py build/

# Create deployment package
cd build
zip -r ../normalizer.zip . -q
cd ..

# Cleanup
rm -rf build

echo "✅ Normalizer package created: apps/normalizer/normalizer.zip"
echo "   Size: $(du -h normalizer.zip | cut -f1)"
