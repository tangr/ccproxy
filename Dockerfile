# Multi-stage build for Next.js application

# Stage 1: Build dependencies (includes TypeScript for compilation)
FROM node:24-alpine AS builder

WORKDIR /build

# Copy package files
COPY package*.json ./

# Install ALL dependencies including devDependencies for build
# TypeScript, Tailwind, etc. are needed here for compilation
RUN npm ci && npm cache clean --force

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Development image
FROM node:24-alpine AS development

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl \
    && addgroup --gid 1001 --system nodejs \
    && adduser --system nextjs --uid 1001

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Keep running as root for development to avoid permission issues with volume mounts
# USER nextjs

# Expose application and debug ports
EXPOSE 3000 9229

# Set environment variables for development
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

# Default command for development
CMD ["npm", "run", "dev"]

# Stage 3: Production image (NO TypeScript - runtime only)
FROM node:24-alpine AS production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl \
    && addgroup --gid 1001 --system nodejs \
    && adduser --system nextjs --uid 1001

# Copy compiled files from builder (TypeScript already compiled to JS)
COPY --from=builder --chown=nextjs:nodejs /build/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /build/public ./public
COPY --from=builder --chown=nextjs:nodejs /build/package*.json ./
COPY --from=builder --chown=nextjs:nodejs /build/config ./config

# Install ONLY production dependencies (excludes TypeScript, Tailwind, etc.)
RUN npm ci --only=production && npm cache clean --force

# Switch to non-root user
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Expose application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Default command
CMD ["npm", "start"]
