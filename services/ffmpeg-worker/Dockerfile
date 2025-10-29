FROM node:20-slim

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY worker.js ./

# Create work directory for transcoding
RUN mkdir -p /tmp/transcoding && \
    chmod 777 /tmp/transcoding

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('pg').Pool({connectionString:process.env.DATABASE_URL}).query('SELECT 1').then(()=>process.exit(0)).catch(()=>process.exit(1))"

# Run worker
CMD ["node", "worker.js"]
