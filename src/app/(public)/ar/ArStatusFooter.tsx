'use client';

import { Crosshair, Plane, Radar } from 'lucide-react';
import type { UserPosition } from '@/app/(public)/ar/useUserPosition';

interface Props {
  position: UserPosition | null;
  pitch: number | null;
  visibleCount: number;
}

function StatCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <div className="leading-tight">
        <div className="text-[7px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest uppercase">{label}</div>
        <div className="text-[10px] font-[var(--font-heading)] font-bold text-[var(--text-primary)] tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function formatLatLon(position: UserPosition): string {
  return `${position.lat.toFixed(3)}°, ${position.lon.toFixed(3)}°`;
}

/** Bottom readout: lat/lon, pitch, and visible-aircraft count. */
export function ArStatusFooter({ position, pitch, visibleCount }: Props) {
  return (
    <div className="absolute bottom-4 left-4 right-4 glass-panel rounded-xl px-3 py-2 flex items-center justify-between pointer-events-none">
      <StatCell
        icon={<Crosshair size={12} className="text-[var(--primary)]" />}
        label="Location"
        value={position ? formatLatLon(position) : '—'}
      />
      <StatCell
        icon={<Radar size={12} className="text-[var(--accent)]" />}
        label="Pitch"
        value={pitch != null ? `${Math.round(pitch)}°` : '—'}
      />
      <StatCell
        icon={<Plane size={12} className="text-[var(--success)]" />}
        label="In view"
        value={`${visibleCount}`}
      />
    </div>
  );
}
