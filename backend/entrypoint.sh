#!/bin/sh
set -e

echo "🔄 Syncing database schema (additive only — no data loss)..."
# db push with --accept-data-loss=false ensures it NEVER deletes any data or columns
npx prisma db push --accept-data-loss=false --skip-generate

echo "📦 Running one-time script: updating all current SHIPPED orders to DELIVERED..."
node scripts/deliver-all-shipped.js || true

echo "🚀 Starting Anjali Alankaram API..."
# exec ensures Node process receives SIGTERM for graceful ECS shutdown
exec node dist/main
