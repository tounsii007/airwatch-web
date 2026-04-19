'use client';

import { ArrowUpDown, Compass, Gauge, MountainSnow } from 'lucide-react';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import type { AltitudeUnit, SpeedUnit } from '@/lib/types';
import type { TripSnapshot } from '@/components/replay3d/interpolateTrip';
import { formatWallClock } from '@/components/replay3d/formatClock';
import { CONVERSION } from '@/lib/constants';

interface Props {
  snapshot: TripSnapshot | null;
  wallClockEpochMs: number;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  callsign: string | null;
  icao24: string;
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 text-[var(--primary)]">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[8px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest uppercase">{label}</div>
        <div className="text-xs font-[var(--font-heading)] font-bold text-[var(--text-primary)] tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function formatVsFpm(vsMs: number): string {
  if (vsMs === 0) return '—';
  const fpm = Math.round(vsMs * CONVERSION.msToFpm);
  const sign = fpm > 0 ? '+' : '';
  return `${sign}${fpm} fpm`;
}

/** Top-left HUD: callsign + live telemetry + wall clock. */
export function TelemetryHud({ snapshot, wallClockEpochMs, altitudeUnit, speedUnit, callsign, icao24 }: Props) {
  return (
    <div className="absolute top-4 left-4 glass-panel rounded-xl p-3 w-52 pointer-events-none space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-[var(--font-heading)] font-bold text-sm tracking-wider text-[var(--primary)]">
          {callsign || icao24}
        </span>
        <span className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tabular-nums">
          {formatWallClock(wallClockEpochMs)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Row icon={<MountainSnow size={12} />} label="Alt" value={snapshot ? formatAltitude(snapshot.position[2], altitudeUnit) : '—'} />
        <Row icon={<Gauge size={12} />}       label="Spd" value={snapshot ? formatSpeed(snapshot.speedMs, speedUnit) : '—'} />
        <Row icon={<Compass size={12} />}     label="Hdg" value={snapshot ? `${Math.round(snapshot.headingDeg)}°` : '—'} />
        <Row icon={<ArrowUpDown size={12} />} label="V/S" value={snapshot ? formatVsFpm(snapshot.verticalSpeedMs) : '—'} />
      </div>
    </div>
  );
}
