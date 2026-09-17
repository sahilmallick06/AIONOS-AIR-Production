# Multi-stage Dockerfile for AIONOS AIR Resolution Control
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy application source code
COPY . .

# Build Vite frontend and bundled Node server
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and production dependencies
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/AIONOS_AIR_Executive_Presentation.pptx ./AIONOS_AIR_Executive_Presentation.pptx
COPY --from=builder /app/metadata.json ./metadata.json

# Expose default port
EXPOSE 3000

# Bind to 0.0.0.0 and platform PORT
CMD ["node", "dist/server.cjs"]
