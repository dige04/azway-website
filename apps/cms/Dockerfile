# syntax=docker/dockerfile:1
# Strapi CMS image, host-neutral: listens on $PORT (default 1337), health
# check at /_health. Build from the repo root, where the pnpm lockfile lives:
#   docker build -f apps/cms/Dockerfile --build-arg ADMIN_PATH=/<path> .
# Runtime env: apps/cms/.env.example (secrets, DATABASE_*, R2_*, ...).

ARG NODE_VERSION=22.22

# Workspace manifests only: the frozen lockfile with `--filter @azway/cms`
# installs the CMS's exact CI versions and none of apps/web's packages.
FROM node:${NODE_VERSION}-alpine AS manifests
# Same pnpm as `packageManager` in package.json. Build tools for native
# modules (better-sqlite3) in case no prebuilt musl binary is downloadable.
RUN apk add --no-cache python3 make g++ && npm install -g pnpm@10.28.0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/cms/package.json apps/cms/

FROM manifests AS build
RUN pnpm install --frozen-lockfile --filter @azway/cms
COPY apps/cms apps/cms
# NFR-07: the admin path is baked into the admin bundle by `strapi build`.
# Required and custom, so the image cannot serve the admin at the public /admin.
ARG ADMIN_PATH
RUN case "$ADMIN_PATH" in \
      /admin | */) ;; \
      /?*) exit 0 ;; \
    esac; \
    echo "build arg ADMIN_PATH is required: a custom path such as /quan-tri-xyz, not /admin, no trailing slash (got '$ADMIN_PATH')" >&2; \
    exit 1
ENV NODE_ENV=production ADMIN_PATH=${ADMIN_PATH}
RUN pnpm --filter @azway/cms build

FROM manifests AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter @azway/cms

FROM node:${NODE_VERSION}-alpine
ARG ADMIN_PATH
# The server must serve the admin at the same path the bundle was built for.
ENV NODE_ENV=production ADMIN_PATH=${ADMIN_PATH} STRAPI_TELEMETRY_DISABLED=true
WORKDIR /app
# pnpm layout: packages in /app/node_modules/.pnpm, symlinked from apps/cms.
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/apps/cms/node_modules apps/cms/node_modules
COPY --from=build /app/apps/cms/dist apps/cms/dist
COPY --from=build /app/apps/cms/public apps/cms/public
COPY apps/cms/package.json apps/cms/tsconfig.json apps/cms/favicon.png apps/cms/
COPY apps/cms/database apps/cms/database
# Code stays root-owned; the app user may write only uploads (local provider,
# when R2_* is unset) and .tmp (SQLite, when DATABASE_CLIENT=sqlite).
RUN mkdir -p apps/cms/public/uploads apps/cms/.tmp \
  && chown -R node:node apps/cms/public/uploads apps/cms/.tmp
USER node
WORKDIR /app/apps/cms
EXPOSE 1337
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||1337)+'/_health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node_modules/.bin/strapi", "start"]
