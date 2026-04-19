#!/usr/bin/env bash
# Build Next.js static export and copy to Spring Boot resources/static/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="$SCRIPT_DIR"
API_DIR="$SCRIPT_DIR/../airwatch-api"
STATIC_DIR="$API_DIR/src/main/resources/static"

echo "=== Building Next.js static export ==="
cd "$WEB_DIR"

# Production build: static export with relative URLs (same-origin)
BUILD_EXPORT=true NEXT_PUBLIC_BACKEND_URL="" npm run build

echo "=== Copying out/ to Spring Boot static resources ==="
rm -rf "$STATIC_DIR"
cp -r "$WEB_DIR/out" "$STATIC_DIR"

echo "=== Done ==="
echo "Static files deployed to: $STATIC_DIR"
echo "Total size: $(du -sh "$STATIC_DIR" | cut -f1)"
echo ""
echo "Now rebuild and start Spring Boot:"
echo "  cd $API_DIR && ./mvnw spring-boot:run"
