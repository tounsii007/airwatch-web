/**
 * Lightweight inline SVG world map — placeholder for a full
 * country-choropleth heatmap of blocked IPs.
 *
 * Why inline SVG instead of a real map library:
 *   The admin dashboard already uses Leaflet/MapLibre for the public
 *   flight map; loading a second cartographic stack just to colour
 *   ~30 polygons is overkill. An equirectangular projection of country
 *   bounding boxes is enough to tell a "where are the threats coming
 *   from" story — pixel-perfect borders aren't the point.
 *
 *   The `data` prop maps ISO-3166 alpha-2 country codes to a count;
 *   bigger counts get a more saturated tint. Labels show the top 5
 *   contributors as floating chips.
 *
 * For Phase 1 the geo-IP integration isn't wired up yet, so we render
 * the chart in "ready / awaiting data" mode with the world outline
 * + a subtle "Coming Phase 2" footnote.
 */

interface Props {
  /** countryCode → count. Empty object renders the placeholder state. */
  data: Readonly<Record<string, number>>;
  height?: number;
}

// Bounding-box (lat-min, lat-max, lon-min, lon-max) for the most likely
// originating regions. This is intentionally coarse — refining the
// borders is a Phase 3 polish task.
const REGIONS: Record<string, { name: string; latMin: number; latMax: number; lonMin: number; lonMax: number }> = {
  US: { name: 'USA',          latMin:  25, latMax: 49, lonMin: -125, lonMax:  -67 },
  CA: { name: 'Canada',       latMin:  49, latMax: 70, lonMin: -141, lonMax:  -52 },
  BR: { name: 'Brazil',       latMin: -33, latMax:   5, lonMin: -74, lonMax:  -34 },
  GB: { name: 'UK',           latMin:  50, latMax:  60, lonMin: -10, lonMax:    2 },
  DE: { name: 'Germany',      latMin:  47, latMax:  55, lonMin:   6, lonMax:   15 },
  FR: { name: 'France',       latMin:  42, latMax:  51, lonMin:  -5, lonMax:    8 },
  IT: { name: 'Italy',        latMin:  36, latMax:  47, lonMin:   7, lonMax:   18 },
  ES: { name: 'Spain',        latMin:  36, latMax:  44, lonMin: -10, lonMax:    3 },
  NL: { name: 'Netherlands',  latMin:  51, latMax:  53, lonMin:   3, lonMax:    7 },
  RU: { name: 'Russia',       latMin:  41, latMax:  82, lonMin:  20, lonMax:  179 },
  CN: { name: 'China',        latMin:  18, latMax:  53, lonMin:  73, lonMax:  135 },
  JP: { name: 'Japan',        latMin:  30, latMax:  46, lonMin: 130, lonMax:  146 },
  IN: { name: 'India',        latMin:   8, latMax:  35, lonMin:  68, lonMax:   97 },
  AU: { name: 'Australia',    latMin: -44, latMax: -10, lonMin: 113, lonMax:  154 },
  TR: { name: 'Turkey',       latMin:  36, latMax:  42, lonMin:  26, lonMax:   45 },
  IR: { name: 'Iran',         latMin:  25, latMax:  40, lonMin:  44, lonMax:   63 },
  KR: { name: 'South Korea',  latMin:  33, latMax:  39, lonMin: 125, lonMax:  130 },
  ID: { name: 'Indonesia',    latMin: -11, latMax:   6, lonMin:  95, lonMax:  141 },
  ZA: { name: 'South Africa', latMin: -35, latMax: -22, lonMin:  16, lonMax:   33 },
  NG: { name: 'Nigeria',      latMin:   4, latMax:  14, lonMin:   3, lonMax:   15 },
  EG: { name: 'Egypt',        latMin:  22, latMax:  32, lonMin:  25, lonMax:   35 },
  MX: { name: 'Mexico',       latMin:  14, latMax:  33, lonMin: -118, lonMax: -86 },
  AR: { name: 'Argentina',    latMin: -55, latMax: -22, lonMin:  -73, lonMax: -53 },
};

// Equirectangular projection: lon → x, lat → y, both normalised to viewBox.
function project(lat: number, lon: number, w: number, h: number): [number, number] {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return [x, y];
}

export function WorldMap({ data, height = 320 }: Props) {
  const VIEW_W = 720;
  const VIEW_H = 360;

  const max = Math.max(0, ...Object.values(data));
  const total = Object.values(data).reduce((a, b) => a + b, 0);

  // Top 5 originators rendered as floating labels.
  const top = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div style={{ position: 'relative' }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height={height}
        style={{ display: 'block', overflow: 'visible' }}
        role="img"
        aria-label="World map of blocked-request origins"
      >
        {/* Subtle equirectangular grid — lat/lon every 30° */}
        <defs>
          <radialGradient id="wm-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"  stopColor="var(--error)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--error)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[60, 30, 0, -30, -60].map((lat) => (
          <line
            key={`lat-${lat}`}
            x1={0}
            y1={((90 - lat) / 180) * VIEW_H}
            x2={VIEW_W}
            y2={((90 - lat) / 180) * VIEW_H}
            stroke="rgba(122, 154, 191, 0.08)"
            strokeWidth="0.5"
          />
        ))}
        {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
          <line
            key={`lon-${lon}`}
            x1={((lon + 180) / 360) * VIEW_W}
            y1={0}
            x2={((lon + 180) / 360) * VIEW_W}
            y2={VIEW_H}
            stroke="rgba(122, 154, 191, 0.08)"
            strokeWidth="0.5"
          />
        ))}

        {/* Country bounding boxes — coloured by activity */}
        {Object.entries(REGIONS).map(([code, region]) => {
          const count = data[code] ?? 0;
          const intensity = max > 0 ? count / max : 0;
          const [x1, y2] = project(region.latMin, region.lonMin, VIEW_W, VIEW_H);
          const [x2, y1] = project(region.latMax, region.lonMax, VIEW_W, VIEW_H);
          const w = x2 - x1;
          const h = y2 - y1;
          return (
            <g key={code}>
              <rect
                x={x1}
                y={y1}
                width={w}
                height={h}
                rx={2}
                fill={
                  count > 0
                    ? `color-mix(in srgb, var(--error) ${Math.round(15 + intensity * 60)}%, transparent)`
                    : 'rgba(122, 154, 191, 0.05)'
                }
                stroke={count > 0 ? 'var(--error)' : 'rgba(122, 154, 191, 0.18)'}
                strokeWidth={count > 0 ? 0.7 : 0.4}
              />
              {count > 0 && (
                <circle
                  cx={x1 + w / 2}
                  cy={y1 + h / 2}
                  r={3 + intensity * 6}
                  fill="url(#wm-glow)"
                  style={{ pointerEvents: 'none' }}
                >
                  <animate
                    attributeName="r"
                    values={`${3 + intensity * 6};${5 + intensity * 6};${3 + intensity * 6}`}
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {total === 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.75rem',
              letterSpacing: '0.15em',
              color: 'var(--text-muted)',
              textAlign: 'center',
              padding: '0.5rem 1rem',
              borderRadius: 4,
              background: 'var(--sunken)',
              border: '1px solid var(--border)',
            }}
          >
            <div>NO GEO DATA YET</div>
            <div style={{ fontSize: '0.625rem', marginTop: 4, color: 'var(--text-muted)', opacity: 0.7 }}>
              Geo-IP enrichment lands in Phase 2
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'flex-end',
            pointerEvents: 'none',
          }}
        >
          {top.map(([code, count]) => (
            <div
              key={code}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.6875rem',
                letterSpacing: '0.05em',
                background: 'var(--sunken)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                padding: '2px 6px',
                color: 'var(--text-primary)',
              }}
            >
              <span style={{ color: 'var(--error)' }}>{code}</span>
              <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
