FROM node:24-slim AS fetch
ENV CI=true
WORKDIR /app
RUN corepack enable pnpm && corepack install -g pnpm@latest-10
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

FROM fetch AS build
COPY package.json tsconfig.base.json ./
COPY packages/common/package.json packages/common/
COPY packages/common/tsconfig.json packages/common/
COPY packages/dashboard-server/package.json packages/dashboard-server/
COPY packages/dashboard-server/tsconfig.app.json packages/dashboard-server/
COPY packages/dashboard-web/package.json packages/dashboard-web/
COPY packages/dashboard-web/tsconfig.json packages/dashboard-web/
COPY packages/dashboard-web/tsconfig.app.json packages/dashboard-web/
COPY packages/dashboard-web/vite.config.ts packages/dashboard-web/
COPY packages/start-gg/package.json packages/start-gg/
COPY packages/website/package.json packages/website/
RUN pnpm install -r --offline
COPY . .
RUN pnpm --filter @emily-curry/fgc-sync-common run build
RUN pnpm --filter @emily-curry/fgc-sync-dashboard-web run build
RUN pnpm --filter @emily-curry/fgc-sync-dashboard-server run build
RUN pnpm -r run purge && pnpm install -r --offline --prod

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app .
USER node
EXPOSE 3030
CMD ["node", "packages/dashboard-server/dist/index.js"]
