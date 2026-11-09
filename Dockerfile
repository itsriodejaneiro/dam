# The app for production, the image a deploy builds and runs next to PocketBase.
#
# The build context is the repository root (compose.yaml).

# The minor pinned, like the lockfile it reads: a new minor may change the lockfile
# format under a frozen install.
FROM oven/bun:1.3-alpine AS build
WORKDIR /src

# The manifests first and the sources second, so a code change does not reinstall the tree.
COPY package.json bun.lock .npmrc ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# A production install from scratch instead of the build tree: Vite, svelte-check and
# TypeScript are the bulk of it and none of them run here.
FROM oven/bun:1.3-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock ./
# --ignore-scripts: `prepare` runs svelte-kit sync, a build tool this stage leaves out.
RUN bun install --frozen-lockfile --production --ignore-scripts

COPY --from=build /src/build ./build

# Nothing here writes to disk: the data lives in PocketBase's volume.
USER bun

EXPOSE 3000

# /login answers without a schema or a superuser, so a project still waiting for /setup
# counts as healthy.
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --start-interval=2s \
	CMD wget -qO /dev/null http://127.0.0.1:3000/login || exit 1

CMD ["bun", "./build/index.js"]
