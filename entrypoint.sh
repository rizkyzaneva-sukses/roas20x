#!/bin/sh
set -e

echo "=== ROAS20X Startup ==="
echo "NODE_ENV=$NODE_ENV"
echo "PORT=$PORT"
echo "HOSTNAME=$HOSTNAME"

echo ""
echo "[1/4] Running pre-migration role cleanup..."
node node_modules/prisma/build/index.js db execute \
  --file prisma/migrate-roles.sql \
  --schema prisma/schema.prisma \
  || echo "Role migration skipped (may already be clean)"

echo ""
echo "[2/4] Syncing database schema..."
node node_modules/prisma/build/index.js db push --accept-data-loss \
  || { echo "WARNING: db push failed, continuing anyway..."; }

echo ""
echo "[3/4] Seeding database..."
node prisma/seed.js || echo "Seed skipped (data may already exist)"

echo ""
echo "[4/4] Starting application on port $PORT..."
exec node server.js
