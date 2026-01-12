FROM ghcr.io/puppeteer/puppeteer:22.12.1

# Switch to root to set permissions
USER root

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip puppeteer chromium download since it's in base image)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci --only=production

# Copy app code
COPY . .

# Set the correct Chrome path for this image
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

EXPOSE 3000

# Run as non-root user
USER pptruser

CMD ["npm", "start"]
