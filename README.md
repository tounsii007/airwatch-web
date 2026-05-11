# AirWatch Web

Flight-tracking web app — live aircraft map, airport/airline search, planespotting, CO₂ estimates, and more.

> ⚠️ This app is a **pure frontend**. All flight data comes from the sibling repo [`airwatch-api`](../airwatch-api). The API must be running for the app to work.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 6**
- **Leaflet** + `react-leaflet` for the map
- **Zustand** (with `persist`) for client state
- **Tailwind CSS 4**
- **Vitest** for unit tests
- **i18n** built-in (EN / DE / FR)

## Prerequisites

- Node.js ≥ 20
- A running `airwatch-api` backend (default: `http://localhost:8080`)

## Quick start

```bash
# 1) install deps
npm install

# 2) configure env (optional — defaults point at localhost:8080)
cp .env.example .env.local

# 3) run dev server
npm run dev          # binds 0.0.0.0 (LAN access, for mobile testing)
# or
npm run dev:local    # localhost only
npm run dev:https    # self-signed HTTPS (needed for geolocation on mobile)
```

Open http://localhost:3000.

## How the backend connection works

All API calls use the relative path `/api/proxy/...`. Next.js `rewrites()` ([`next.config.ts`](./next.config.ts)) forwards them to the backend:

```
Browser  →  /api/proxy/airlabs/flights
            │
            └─ Next.js rewrite
               │
               └─ http://localhost:8080/airlabs/flights  (airwatch-api)
                  │
                  └─ Airlabs API (with caching + rate-limit protection)
```

No CORS config on the frontend needed — the rewrite keeps everything same-origin.

Override the backend URL via `NEXT_PUBLIC_PROXY_URL` (see [`.env.example`](./.env.example)).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on `0.0.0.0:3000` |
| `npm run dev:local` | Dev server on `localhost:3000` |
| `npm run dev:https` | Dev server with self-signed HTTPS |
| `npm run build` | Production build (Next.js + Turbopack) |
| `npm run start` | Serve the built app |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest (multi-env: jsdom for components, node for libs) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright end-to-end suite (`e2e/`) |
| `npm run size` | Bundle budget check — `core` vs `lazy 3D` buckets |
| `npm run size:admin` | Perf budget check for admin shell |
| `npm run i18n:check` | Verify EN/DE/FR locale parity |
| `npm run analyze` | Build with bundle analyzer (`ANALYZE=true`) |
| `npm run generate:api-types` | Regenerate OpenAPI types from running `airwatch-api` |
| `npm run build:city-i18n` | Pre-compute city translation map |

## Project structure

The App Router splits into two route groups so the public bundle
drops every admin payload via Next.js code-splitting. See
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full layout, schema
boundary contracts, and source-map / CSP / PWA notes.

```
src/
├── proxy.ts                 # Per-request CSP nonce + admin-host gate
├── app/
│   ├── (public)/            # Anonymous-visitor surface
│   │   ├── /, airports/, airlines/, cargo/, compare/, dashboard/,
│   │   ├── flight/, geofences/, globe/ (Cesium, lazy chunk),
│   │   ├── replay/, replay/3d/ (deck.gl, lazy chunk),
│   │   ├── saved/, search/, settings/, spotting/, stats/
│   │   └── error.tsx        # Public route-group error boundary
│   ├── (admin)/             # Operator dashboard — gated to admin host
│   │   ├── adminSchemas.ts  # Zod schemas for /admin/api/*
│   │   ├── sourceMapResolver.ts # Client-side stack-trace de-min
│   │   └── admin/
│   │       ├── dashboard/, alerts/, errors/, incidents/, webhooks/, …
│   │       ├── shared/      # AdminDataTable (TanStack), Live SSE consumer
│   │       └── error.tsx    # Admin route-group error boundary
│   ├── api/                 # Next-side API handlers (web-vitals, client-error)
│   ├── global-error.tsx
│   └── layout.tsx
├── components/
│   ├── common/, flight/, geofence/, layout/, map/, replay/, search/, ui/
└── lib/
    ├── apiFetch.ts, constants.ts, data/, flights/, hooks/, i18n/,
    ├── schemas.ts           # Zod validators for the public API boundary
    └── stores/, types/, utils/

public/
├── manifest.json            # PWA manifest
├── sw.js                    # Service worker (4-tier offline fallback)
└── offline.html             # Static fallback served when nothing is cached

scripts/
├── bundle-budget-lib.mjs    # Pure classify/computeVerdict (unit-testable)
├── check-bundle-budget.mjs  # CLI: core vs lazy-3D + per-chunk ceiling
├── check-perf-budget.mjs    # CLI: per-route admin perf budget
└── check-i18n-coverage.mjs  # i18n parity + hardcoded-string scan

.lighthouserc.json           # CI: a11y ≥ 0.90 + CLS < 0.10 are hard asserts
```

## Docker

```bash
# Build the image
docker build -t airwatch-web .

# Run it (pointing at a backend on the host)
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_PROXY_URL=http://host.docker.internal:8080 \
  airwatch-web
```

Or use the root-level `docker-compose.yml` to run frontend + backend together.

## Testing

```bash
npm test                  # run all
npm test -- --watch       # watch mode
npm test -- path/to/file  # single file
```

Current coverage: map styles, arc generation, map interactions, airport index, Airlabs parser, polling interval, Zustand stores.

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit with conventional style: `feat(map): ...`, `fix(api): ...`
3. Run `npm test` and `npm run lint` before pushing
4. Open a PR — CI runs tests and lint automatically
