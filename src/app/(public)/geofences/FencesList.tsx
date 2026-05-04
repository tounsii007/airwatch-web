'use client';

import { Trash2 } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import type { GeoFence } from '@/lib/flights/geofence';

interface Props {
  fences: GeoFence[];
  onDelete: (id?: number) => void;
}

function shapeCaption(f: GeoFence): string {
  if (f.type === 'CIRCLE') return `${f.centerLat?.toFixed(3)}, ${f.centerLon?.toFixed(3)} · r=${f.radiusKm}km`;
  return `${f.northLat?.toFixed(2)}/${f.southLat?.toFixed(2)} × ${f.westLon?.toFixed(2)}/${f.eastLon?.toFixed(2)}`;
}

function altitudeCaption(f: GeoFence): string {
  const parts: string[] = [];
  if (f.minAltitudeFt != null) parts.push(`≥${f.minAltitudeFt}ft`);
  if (f.maxAltitudeFt != null) parts.push(`≤${f.maxAltitudeFt}ft`);
  return parts.length ? ' · ' + parts.join(' · ') : '';
}

function AirlineChip({ airlineIcao }: { airlineIcao?: string | null }) {
  if (!airlineIcao) return null;
  return (
    <span className="text-[9px] px-1.5 py-0.5 bg-[var(--info)]/20 text-[var(--info)] tracking-wider">
      {airlineIcao}
    </span>
  );
}

function FenceRow({ fence, onDelete }: { fence: GeoFence; onDelete: (id?: number) => void }) {
  return (
    <li className="flex items-center justify-between border-b border-[var(--glass-border)]/40 pb-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-[var(--font-heading)] text-[var(--text)] truncate">{fence.name}</span>
          <AirlineChip airlineIcao={fence.airlineFilter} />
        </div>
        <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
          {shapeCaption(fence)}{altitudeCaption(fence)}
        </div>
      </div>
      <button onClick={() => onDelete(fence.id)} className="text-[var(--text-muted)] hover:text-[var(--error)] p-1.5" aria-label="Delete fence">
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
      <h2 className="text-xs font-[var(--font-heading)] font-bold tracking-wider text-[var(--primary)] mb-3">ACTIVE FENCES</h2>
      {fences.length === 0 ? (
        <EmptyRow />
      ) : (
        <ul className="space-y-2">
          {fences.map((f) => <FenceRow key={f.id} fence={f} onDelete={onDelete} />)}
        </ul>
      )}
    </GlassPanel>
  );
}
