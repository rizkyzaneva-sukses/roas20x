#!/bin/sh
set -e

echo "Syncing database schema..."
npx prisma db push

echo "Seeding database..."
node prisma/seed.js || echo "Seed skipped (may already exist)"

echo "Starting application..."
exec node server.js
