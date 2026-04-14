#!/bin/bash
# Build script for NumInfo website
# Injects secrets at build time so they are never visible in public source

set -e

echo "=== NumInfo Build Script ==="

# Check required environment variables
if [ -z "$API_URL" ]; then
    echo "ERROR: API_URL is not set"
    echo "Set it via: export API_URL='https://your-api.com'"
    exit 1
fi

echo "API_URL: ${API_URL}"
echo "Building from src/ to dist/..."

# Create dist directory
mkdir -p dist

# Replace placeholder with actual value and output to dist
sed "s|{{API_URL}}|${API_URL}|g" src/index.html > dist/index.html

echo "Build complete: dist/index.html"

# Show file size
ls -lh dist/index.html
