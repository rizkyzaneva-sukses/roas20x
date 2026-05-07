#!/bin/sh
set -e

echo "Syncing database schema..."
node node_modules/prisma/build/index.js db push

echo "Seeding database..."
node prisma/seed.js || echo "Seed skipped (data may already exist)"

echo "Starting application..."
exec node server.js
