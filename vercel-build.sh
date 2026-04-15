#!/bin/bash
# Vercel build script - injects API_URL env variable into src/index.html

echo "=== Vercel Build Script ==="
echo "API_URL: ${API_URL:-not set}"

# Default API URL if not set
API_URL=${API_URL:-https://mahmud-infinity-api.onrender.com}

mkdir -p dist

# Inject API URL placeholder
sed "s|{{API_URL}}|${API_URL}|g" src/index.html > dist/index.html

# Copy 404 page if it exists
cp src/404.html dist/ 2>/dev/null || true

echo "Build complete: dist/index.html ready for deployment"
ls -lh dist/