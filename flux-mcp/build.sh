#!/bin/bash
set -e  # Exit on error

echo "========================================="
echo "Flux MCP Build Script"
echo "========================================="
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "========================================="

echo ""
echo "[1/3] Installing dependencies..."
npm ci --loglevel=verbose

echo ""
echo "[2/3] Compiling TypeScript..."
npx tsc --version
npx tsc

echo ""
echo "[3/3] Build complete!"
ls -la dist/
echo "========================================="
echo "✅ Build successful!"
