# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all deps (including devDeps needed for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build backend (esbuild → dist/index.cjs) and frontend (vite → dist/public)
RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Only copy production artifacts + package files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install only production dependencies
# better-sqlite3 is excluded on Railway (Postgres is used via DATABASE_URL)
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev --ignore-scripts

# Railway sets PORT automatically; default to 5000 for local docker testing
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
