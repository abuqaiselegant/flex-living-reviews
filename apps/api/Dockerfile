# API Gateway Service
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/
COPY server.ts ./
COPY tsconfig.json ./

# Install TypeScript and ts-node globally
RUN npm install -g typescript ts-node

# Expose port
EXPOSE 3001

# Run the application
CMD ["npx", "ts-node", "server.ts"]
