# Web AI Coding Agent Lab — single-image teaching deploy.
# The server runs via tsx and serves the prebuilt web SPA.
# python3 + bash are included for local validation commands.
FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 bash ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (workspaces). Dev deps included: we run via tsx and build with vite.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci

# Copy source and build the web SPA.
COPY . .
RUN npm run build

ENV NODE_ENV=production \
    PORT=8787 \
    WAC_WORKSPACE_ROOT=/app/examples/buggy-ts-project \
    WAC_SESSION_LOG_PATH=/app/data/session-log.json

EXPOSE 8787
VOLUME ["/app/data"]

# deepseek_KEY may be provided at runtime when MODEL_PROVIDER=openai_compatible.
CMD ["npm", "run", "start"]
