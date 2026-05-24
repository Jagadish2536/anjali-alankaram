#!/bin/sh
set -e

echo "🔄 Syncing database schema (additive only — no data loss)..."
# db push with --accept-data-loss=false ensures it NEVER deletes any data or columns
# It only adds new enum values, tables, or columns
npx prisma db push --accept-data-loss=false --skip-generate

echo "🚀 Starting Anjali Alankaram API..."
# exec ensures Node process receives SIGTERM for graceful ECS shutdown
exec node dist/main
