# MetMap Dockerfile for DigitalOcean App Platform
# Next.js 14 standalone build

FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Copy package files and prisma schema (needed for postinstall)
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies (runs prisma generate via postinstall)
RUN npm ci

# Copy source and build
COPY . .

# Set build-time environment variables
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build Next.js app
RUN npm run build

# Production image
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma runtime
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma schema and node_modules for db push
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

# Copy entrypoint script
COPY scripts/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Create cache directory with proper permissions for Next.js ISR
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache

USER nextjs

EXPOSE 3000

CMD ["./entrypoint.sh"]
