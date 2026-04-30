# Multi-stage build for AirWatch Web (Next.js 16 + React 19).
#
# Uses Next's `output: 'standalone'` (set in next.config.ts) so the runtime
# image carries only the trace-pruned subset of node_modules + a single
# `server.js`. Final image is ~150 MB instead of ~1 GB and contains no
# package manager / compiler / source files — anything that lands inside
# via RCE has nothing to leverage.

# ─── deps: install once, cache aggressively ────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Optional deps stay enabled: Tailwind 4 ships lightningcss with
# OS-specific native bindings (lightningcss-linux-x64-musl etc.) that npm
# selects from the optionalDependencies cpu/os matrix. Cutting them off
# breaks `next build` with "lightningcss native binding missing".
#
# openapi-typescript is invoked via `npx` from the generate:api-types
# script — see the _dev_tools_note in package.json — so it never lands
# here either way.
RUN npm ci

# ─── build: produce .next/standalone ───────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* must be present at BUILD time (Next inlines them into the
# client bundle). Passed via compose `args:` so the same image works for
# any deployment that overrides the API URL via .env.
ARG NEXT_PUBLIC_PROXY_URL=http://localhost:18080
ENV NEXT_PUBLIC_PROXY_URL=$NEXT_PUBLIC_PROXY_URL

# Server-only target for Next.js's rewrite() proxy. Next bakes the rewrite
# destinations into the standalone build output at `npm run build` time, so
# this MUST be available as an ENV at build time. Defaults to the docker
# service name `nginx` since that's how the web container reaches the LB
# in compose. Override for non-docker dev (`next dev` outside the
# container) by exporting INTERNAL_API_URL=http://localhost:18080 first.
ARG INTERNAL_API_URL=http://nginx:18080
ENV INTERNAL_API_URL=$INTERNAL_API_URL

# Telemetry off — we don't ship build telemetry to Vercel.
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ─── runtime: minimal alpine + standalone bundle ───────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user. Files are pre-chowned in COPY so we don't need an extra
# `chown -R` layer.
RUN addgroup -S nextjs -g 1001 && adduser -S nextjs -G nextjs -u 1001

# Static assets that Next serves directly (the public folder + the
# fingerprinted chunks under .next/static).
COPY --from=build --chown=nextjs:nextjs /app/public ./public
COPY --from=build --chown=nextjs:nextjs /app/.next/static ./.next/static

# The standalone server bundle — includes its own copy of the minimal
# node_modules tree Next traced as required for runtime.
COPY --from=build --chown=nextjs:nextjs /app/.next/standalone ./

USER nextjs
EXPOSE 3000

# Compose sets PORT and HOSTNAME via env; the standalone server reads them.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:${PORT}/ || exit 1

CMD ["node", "server.js"]
