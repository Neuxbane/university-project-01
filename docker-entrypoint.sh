#!/bin/sh
set -e

echo "=========================================================="
echo "🚀 Hex Titanium Bolt Specification Web System (Docker)"
echo "=========================================================="

echo "⏳ Checking database connection..."
MAX_RETRIES=30
COUNT=0
until node -e "
const net = require('net');
const client = net.createConnection({ host: 'postgres', port: 5432 }, () => {
  client.end();
  process.exit(0);
});
client.on('error', () => process.exit(1));
"; do
  COUNT=$((COUNT+1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Database not reachable after $MAX_RETRIES seconds. Exiting."
    exit 1
  fi
  echo "Waiting for postgres database to be reachable ($COUNT/$MAX_RETRIES)..."
  sleep 1
done

echo "✅ Database connection established."

echo "🔄 Synchronizing database schema with Prisma db push..."
npx prisma db push --skip-generate

# Seed policy:
#   - production  -> never seed automatically (protects real shop data)
#   - development -> seed only when the database is still empty (no users)
if [ "${NODE_ENV:-development}" = "production" ]; then
  echo "⏭️  NODE_ENV=production: automatic seeding skipped."
  echo "   To load initial data manually: docker compose exec backend node prisma/seed.js"
else
  USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count()
  .then((c) => { console.log(c); return prisma.\$disconnect(); })
  .catch(() => { console.log('error'); process.exit(0); });
")

  if [ "$USER_COUNT" = "0" ]; then
    echo "🌱 Database is empty: running database seeding..."
    if ! node prisma/seed.js; then
      echo "❌ Seeding failed. Check the error above."
    fi
  elif [ "$USER_COUNT" = "error" ]; then
    echo "⚠️  Could not check database contents: seeding skipped."
  else
    echo "⏭️  Database already has data ($USER_COUNT users): seeding skipped."
  fi
fi

echo "=========================================================="
echo "🚀 Hex Titanium System Ready!"
echo "  ➜  Local UI:    http://localhost:${PORT:-3000}/"
echo "  ➜  Backend API: http://localhost:${PORT:-3000}/api"
echo "  ➜  Backend Port: ${PORT:-3000}"
echo "=========================================================="

exec "$@"
