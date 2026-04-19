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
| `npm run build` | Production build |
| `npm run start` | Serve the built app |
| `npm run lint` | ESLint |
| `npm test` | Vitest (Node env, threads pool) |

## Project structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── airports/           # Airport list + detail
│   ├── airlines/[icao]/    # Airline detail
│   ├── cargo/              # Cargo tracking
│   ├── dashboard/          # Multi-airport dashboard
│   ├── saved/              # Favorites (persisted)
│   ├── search/             # Search airports/airlines/flights
│   ├── settings/           # Theme, units, language, interval
│   ├── spotting/           # Planespotting (geolocation)
│   └── stats/              # Personal flight stats
├── components/
│   ├── common/             # FlagImage, LogoImage, ManagedImage
│   ├── flight/             # FlightDetailsPanel + details view-model
│   ├── layout/             # BottomNav, ThemeProvider
│   ├── map/                # MapView + hooks (markers, labels, layers, radar, routes)
│   ├── search/             # SearchInput, ResultTile
│   └── ui/                 # GlassPanel, NeonText, StatusBadge
└── lib/
    ├── apiFetch.ts         # fetch wrapper with error logging
    ├── constants.ts        # API URL builder, colors, config
    ├── data/               # Airports, airlines, i18n maps
    ├── flights/            # Airlabs types, polling, API calls
    ├── hooks/              # useSquawkAlerts, useWeatherRadar, useFlightFeed
    ├── i18n/               # Translations (EN/DE/FR)
    ├── stores/             # Zustand stores (persisted)
    ├── types/              # Shared types
    └── utils/              # Formatting, math, conversion
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
