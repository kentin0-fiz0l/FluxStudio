FROM node:20-slim

# Install Playwright system dependencies and Chromium
RUN apt-get update && \
    apt-get install -y wget gnupg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY services/browser-worker/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install Playwright Chromium with system deps
RUN npx playwright install chromium --with-deps

# Copy worker source
COPY services/browser-worker/ ./

# Create uploads directory
RUN mkdir -p /app/uploads

# Run worker
CMD ["node", "worker.js"]
