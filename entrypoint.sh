#!/bin/sh
set -e

echo "Running pre-migration role cleanup..."
node node_modules/prisma/build/index.js db execute --file prisma/migrate-roles.sql --schema prisma/schema.prisma || echo "Role migration skipped (may already be clean)"

echo "Syncing database schema..."
node node_modules/prisma/build/index.js db push --accept-data-loss

echo "Seeding database..."
node prisma/seed.js || echo "Seed skipped (data may already exist)"

echo "Starting application..."
exec node server.js
