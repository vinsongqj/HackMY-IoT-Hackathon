# syntax=docker/dockerfile:1

# ---- Build stage: compile the Vite/React app into static assets ----
FROM node:24-alpine AS build
WORKDIR /app

# Install exact deps from the lockfile first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage: serve the static build + reverse-proxy the API ----
FROM nginx:alpine

# Routes /api and /ws to the `backend` service; serves the SPA otherwise.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
