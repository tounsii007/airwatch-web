'use client';

import { Circle, Square, Trash2, MapPin, Plane, ArrowUp, ArrowDown } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { AIRLINES } from '@/lib/data/airlines';
import type { GeoFence } from '@/lib/flights/geofence';

interface Props {
  fences: GeoFence[];
  onDelete: (id?: number) => void;
}

/**
 * Format the geometry as a one-liner human can read at a glance.
 * Circle  → "49.83° N, 9.20° E · r 131.3 km"
 * Rect    → "S 47.0° → N 51.0° · W 5.0° → E 12.0°"
 */
function shapeCaption(f: GeoFence): string {
  if (f.type === 'CIRCLE') {
    return `${f.centerLat?.toFixed(2)}° N, ${f.centerLon?.toFixed(2)}° E · r ${f.radiusKm?.toFixed(1)} km`;
  }
  return `S ${f.southLat?.toFixed(1)}° → N ${f.northLat?.toFixed(1)}° · W ${f.westLon?.toFixed(1)}° → E ${f.eastLon?.toFixed(1)}°`;
}

function TypeIcon({ type }: { type: GeoFence['type'] }) {
  const Icon = type === 'CIRCLE' ? Circle : Square;
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded bg-[var(--primary)]/15 text-[var(--primary)] flex-shrink-0"
      title={type}
      aria-label={`${type} fence`}
    >
      <Icon size={14} strokeWidth={2.2} />
    </span>
  );
}

/** Coloured filter pill (airline / altitude band). Returns null when value is absent. */
function Chip({
  icon,
  label,
  tone = 'info',
  title,
}: {
  icon: React.ReactNode;
  label: string;
  tone?: 'info' | 'warn' | 'muted';
  title?: string;
}) {
  // Pull semantic colors from CSS vars so the chip respects the dark/light theme.
  // tone=info  → primary/info accent (airline)
  // tone=warn  → warning accent     (max-alt cap, "no flights above")
  // tone=muted → neutral text       (min-alt floor)
  const cls =
    tone === 'info'
      ? 'bg-[var(--info)]/15 text-[var(--info)] border-[var(--info)]/30'
      : tone === 'warn'
        ? 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30'
        : 'bg-[var(--surface)] text-[var(--text-muted)] border-[var(--glass-border)]';
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${cls} font-[var(--font-heading)] tracking-wider`}
    >
      {icon}
      {label}
    </span>
  );
}

function FilterChips({ fence }: { fence: GeoFence }) {
  const airlineCode = fence.airlineFilter?.trim();
  // resolveAirline looks up by ICAO (3-letter code); the AirlineFilter is itself
  // an ICAO so we can index AIRLINES directly.
  const airlineName = airlineCode ? AIRLINES[airlineCode.toUpperCase()]?.name : undefined;

  const chips: React.ReactNode[] = [];

  if (airlineCode) {
    chips.push(
      <Chip
        key="airline"
        icon={<Plane size={9} />}
        label={airlineCode}
        title={airlineName ? `Only ${airlineName} (${airlineCode}) flights trigger this fence` : `Airline filter: ${airlineCode}`}
        tone="info"
      />,
    );
  }

  if (fence.minAltitudeFt != null) {
    chips.push(
      <Chip
        key="min"
        icon={<ArrowUp size={9} />}
        label={`≥${fence.minAltitudeFt.toLocaleString()} ft`}
        title="Only flights at or above this altitude trigger this fence"
        tone="muted"
      />,
    );
  }

  if (fence.maxAltitudeFt != null) {
    chips.push(
      <Chip
        key="max"
        icon={<ArrowDown size={9} />}
        label={`≤${fence.maxAltitudeFt.toLocaleString()} ft`}
        title="Only flights at or below this altitude trigger this fence"
        tone="warn"
      />,
    );
  }

  if (chips.length === 0) return null;
  return <div className="flex flex-wrap gap-1 mt-1">{chips}</div>;
}

function FenceRow({ fence, onDelete }: { fence: GeoFence; onDelete: (id?: number) => void }) {
  return (
    <li
      className="flex items-start gap-3 border-b border-[var(--glass-border)]/40 pb-2 last:border-b-0 last:pb-0"
      data-testid="fence-row"
      data-fence-id={fence.id}
    >
      <TypeIcon type={fence.type} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-[var(--font-heading)] text-[var(--text)] truncate" data-testid="fence-name">
          {fence.name}
        </div>
        <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)] flex items-center gap-1 mt-0.5">
          <MapPin size={9} />
          {shapeCaption(fence)}
        </div>
        <FilterChips fence={fence} />
      </div>
      <button
        onClick={() => onDelete(fence.id)}
        className="text-[var(--text-muted)] hover:text-[var(--error)] p-1.5 flex-shrink-0 transition-colors"
        aria-label={`Delete fence ${fence.name}`}
        title="Delete fence"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function EmptyRow() {
  return (
    <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)]">
      No fences yet. Create one above — alerts will appear here when an aircraft enters the zone.
    </p>
  );
}

/** List of the user's active geo-fences with per-row delete. */
export function FencesList({ fences, onDelete }: Props) {
  return (
    <GlassPanel className="p-4">
      <h2 className="text-xs font-[var(--font-heading)] font-bold tracking-wider text-[var(--primary)] mb-3 flex items-center justify-between">
        <span>ACTIVE FENCES</span>
        {fences.length > 0 && (
          <span className="text-[var(--text-muted)] font-normal">
            {fences.length} total
          </span>
        )}
      </h2>
      {fences.length === 0 ? (
        <EmptyRow />
      ) : (
        <ul className="space-y-3">
          {fences.map((f) => (
            <FenceRow key={f.id ?? `${f.name}-${f.type}`} fence={f} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}

// Exported only for unit tests. Keeps the helper colocated with the component
// it serves while letting tests assert on the formatted string directly.
export const __test__ = { shapeCaption };
