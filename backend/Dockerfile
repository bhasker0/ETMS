# Base stage
FROM node:20-alpine AS base

WORKDIR /usr/src/app

# Install build dependencies for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++ postgresql-client

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
RUN npm install

# Development stage (used for local docker compose development with hot-reloading)
FROM base AS development
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

# Build stage
FROM dependencies AS build
COPY . .
RUN npm run build
RUN npm prune --omit=dev

# Production stage
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package*.json ./
EXPOSE 4000
CMD ["node", "dist/main"]
