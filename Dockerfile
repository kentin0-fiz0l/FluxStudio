# Multi-stage build for optimized production image
# Stage 1: Build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build application
ARG NODE_ENV=production
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_OPENAI_API_KEY

ENV NODE_ENV=${NODE_ENV}
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_OPENAI_API_KEY=${VITE_OPENAI_API_KEY}

RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Install nodejs for runtime (if needed for SSR)
RUN apk add --no-cache nodejs npm

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy package.json for health checks
COPY --from=builder /app/package.json /app/package.json

# Add health check script
COPY docker/health-check.js /app/health-check.js

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node /app/health-check.js || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]