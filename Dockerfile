# Use Puppeteer's official image
FROM ghcr.io/puppeteer/puppeteer:22.12.1

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Skip downloading Chromium (already in base image)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
