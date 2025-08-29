# Base image
FROM node:20-alpine

WORKDIR /app

# Copy package.json & package-lock.json
COPY package*.json ./

# Install all dependencies (dev + prod)
RUN npm ci

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Ensure logs dir exists
RUN mkdir -p /app/logs

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Mount logs
VOLUME ["/app/logs"]

# Start app
CMD ["node", "dist/app.js"]
