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

# Run worker
CMD ["node", "worker.js"]
