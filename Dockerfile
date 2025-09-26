# Use official Node.js 20 image
FROM node:20

# Install necessary dependencies for puppeteer (Chrome)
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Install Chrome for Puppeteer
RUN npx puppeteer browsers install chrome

# Copy rest of your code
COPY . .

# Expose port (default Express port)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
