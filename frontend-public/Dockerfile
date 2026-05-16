# syntax=docker/dockerfile:1.7

# ---- Dev dependencies (full install for build) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Prod dependencies (for the runtime image) ----
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app

# Vite bakes VITE_* values into the bundle at build time. Pass them in via
# Render's "Build Args" so the same image works across environments.
ARG VITE_PUBLIC_API_URL
ENV VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- Runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup -S app && adduser -S -G app app

COPY package.json package-lock.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build

USER app
EXPOSE 3000

# react-router-serve honors $PORT, which Render injects at runtime.
CMD ["npm", "run", "start"]
