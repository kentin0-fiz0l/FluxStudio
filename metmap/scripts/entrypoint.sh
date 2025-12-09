#!/bin/sh
set -e

echo "Running database migrations..."
# Use db push to sync schema - will create tables if they don't exist
# This is safe for initial setup and non-breaking changes
npx prisma db push --skip-generate

echo "Starting Next.js server..."
exec node server.js
