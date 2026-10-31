# syntax=docker/dockerfile:1

###############################################################################
# Build stage — installs the whole workspace, generates Prisma Client and
# compiles both the API (server) and the SPA (client).
###############################################################################
FROM node:20-bookworm-slim AS build
WORKDIR /app
ENV NODE_ENV=development

# Prisma engines and the runtime need OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy only manifests first so dependency installation is cached.
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
# --ignore-scripts skips the workspace `postinstall` (prisma generate) until the
# schema has been copied below.
RUN npm ci --ignore-scripts

COPY . .

RUN npx prisma generate --schema server/prisma/schema.prisma
RUN npm run build

###############################################################################
# Runtime stage
###############################################################################
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# Re-install dependencies (dev dependencies are kept so the Prisma CLI is
# available for `migrate deploy` at container start). NODE_ENV=production makes
# npm omit dev dependencies by default, so --include=dev is required here.
COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm ci --ignore-scripts --include=dev

# Build output + generated Prisma Client from the build stage.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server/prisma ./server/prisma

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS http://localhost:4000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
