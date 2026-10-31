#!/bin/sh
# Entrypoint for the portfolio API container.
# Applies database migrations, optionally bootstraps the owner account, then
# starts the server (which also serves the built SPA when present).
set -e

echo "[entrypoint] Applying database migrations…"
npx prisma migrate deploy --schema server/prisma/schema.prisma

# Create the owner account the first time the container starts, if the
# credentials are provided. `setup-owner` is idempotent: it does nothing when
# an account already exists.
if [ -n "$OWNER_EMAIL" ] && [ -n "$OWNER_PASSWORD" ]; then
  echo "[entrypoint] Ensuring the owner account exists…"
  node server/dist/scripts/setup-owner.js || true
else
  echo "[entrypoint] OWNER_EMAIL / OWNER_PASSWORD not set — skipping owner bootstrap."
  echo "[entrypoint] Run 'npm run setup:owner' (or set the vars and restart) to create the admin account."
fi

echo "[entrypoint] Starting the API on port ${PORT:-4000}…"
exec node server/dist/index.js
