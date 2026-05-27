# ─── Dependencies Stage ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ─── Build Stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ─── Runtime Stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN addgroup -S rbm && adduser -S rbm -G rbm
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=rbm:rbm /app/.next/standalone ./
COPY --from=build --chown=rbm:rbm /app/.next/static ./.next/static
COPY --from=build --chown=rbm:rbm /app/public ./public

USER rbm
EXPOSE 3000

CMD ["node", "server.js"]
