# ========================================
# Multi-stage Dockerfile for Production
# ========================================

# ----------------------------------------
# Stage 1: Base Image with Dependencies
# ----------------------------------------
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    vips \
    vips-dev \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY next.config.ts ./

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# ----------------------------------------
# Stage 2: Build Dependencies
# ----------------------------------------
FROM base AS build-deps

# Install all dependencies including dev
RUN npm ci --ignore-scripts

# ----------------------------------------
# Stage 3: Builder
# ----------------------------------------
FROM build-deps AS builder

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ----------------------------------------
# Stage 4: Production Runner
# ----------------------------------------
FROM node:18-alpine AS runner

# Install production dependencies and runtime
RUN apk add --no-cache \
    vips \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.js ./

# Copy database
RUN mkdir -p /app/db && \
    touch /app/db/production.db

# Set proper permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# ----------------------------------------
# Development Stage
# ----------------------------------------
FROM base AS development

# Install nodemon for hot reloading
RUN npm install -g nodemon tsx

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose ports for both Next.js and frontend
EXPOSE 3000 5173

# Start development server
CMD ["npm", "run", "dev"]

# ----------------------------------------
# Testing Stage
# ----------------------------------------
FROM build-deps AS test

# Run tests
RUN npm run test:all

# ----------------------------------------
# Production with Monitoring Stage
# ----------------------------------------
FROM runner AS production-monitored

# Install monitoring tools
USER root
RUN apk add --no-cache \
    curl \
    nc \
    tzdata

# Set timezone
ENV TZ=UTC

# Copy monitoring scripts
COPY --chown=nextjs:nodejs docker/monitoring/ /app/monitoring/

# Switch back to non-root user
USER nextjs

# Add PM2 for process management
RUN npm install -g pm2 pm2-docker

# Start with PM2
CMD ["pm2-runtime", "server.js", "--no-daemon"]
