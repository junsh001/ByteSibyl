# CodeForge — single-image deploy.
# The server runs the agent via tsx and serves the prebuilt web SPA.
# python3 + bash are included so the in-app sandbox can run JS *and* Python.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 bash ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (workspaces). Dev deps included: we run via tsx and build with vite.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/agent/package.json packages/agent/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci

# Copy source and build the web SPA.
COPY . .
RUN npm run build

ENV NODE_ENV=production \
    PORT=8787 \
    WORKSPACE_ROOT=/app/data/workspaces \
    DATABASE_URL=/app/data/app.db

EXPOSE 8787
VOLUME ["/app/data"]

# deepseek_KEY must be provided at runtime (-e deepseek_KEY=sk-... or compose env).
CMD ["npm", "run", "start"]
