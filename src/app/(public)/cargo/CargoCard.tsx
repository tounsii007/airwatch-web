'use client';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ManagedImage } from '@/components/common/ManagedImage';
import { OfflineBadge } from '@/components/common/OfflineBadge';
import { formatAltitude, formatSpeed, getAltitudeColor } from '@/lib/utils';
import { getAirlineLogoUrl, resolveAirline } from '@/lib/data/airlines';
import type { AircraftState, AltitudeUnit, SpeedUnit } from '@/lib/types';
import { CargoRouteRow } from '@/app/(public)/cargo/CargoRouteRow';

interface Props {
  aircraft: AircraftState;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  onTrack: () => void;
}

function displayCallsign(ac: AircraftState, iata: string | undefined): string {
  if (iata && ac.callsign) return `${iata}${ac.callsign.slice(3)}`;
  return ac.callsign || ac.icao24;
}

function AltDot({ aircraft }: { aircraft: AircraftState }) {
  const color = getAltitudeColor(aircraft.baroAltitude, aircraft.onGround);
  return <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}

function Logo({ airlineIata, aircraft, operatorName }: { airlineIata?: string; aircraft: AircraftState; operatorName: string }) {
  if (!airlineIata) return <AltDot aircraft={aircraft} />;
  return (
    <div className="relative w-14 h-7 bg-white rounded shrink-0 shadow-sm overflow-hidden flex items-center justify-center px-1">
      <ManagedImage
        src={getAirlineLogoUrl(airlineIata, 'sm')}
        alt={operatorName}
        fill sizes="56px" unoptimized
        className="object-contain p-1"
        fallback={<AltDot aircraft={aircraft} />}
      />
    </div>
  );
}

function LeftSide({ aircraft, operatorName, airlineIata }: { aircraft: AircraftState; operatorName: string; airlineIata?: string }) {
  const cs = displayCallsign(aircraft, airlineIata);
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <Logo airlineIata={airlineIata} aircraft={aircraft} operatorName={operatorName} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-[var(--font-heading)] text-sm font-bold text-[var(--primary)]">{cs}</span>
          <StatusBadge status={aircraft.flightStatus} />
          <OfflineBadge aircraft={aircraft} />
        </div>
        <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)] truncate">{operatorName}</div>
      </div>
    </div>
  );
}

function RightSide({ aircraft, altitudeUnit, speedUnit }: Pick<Props, 'aircraft' | 'altitudeUnit' | 'speedUnit'>) {
  return (
    <div className="text-right shrink-0 ml-3">
      <div className="text-xs font-[var(--font-heading)] text-[var(--accent)]">{formatAltitude(aircraft.baroAltitude, altitudeUnit)}</div>
      <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">{formatSpeed(aircraft.velocity, speedUnit)}</div>
    </div>
  );
}

/** One card in the cargo list — clickable to open the flight on the map. */
export function CargoCard({ aircraft, altitudeUnit, speedUnit, onTrack }: Props) {
  const airlineInfo = resolveAirline(aircraft.callsign ?? '');
  const operatorName = airlineInfo?.name ?? aircraft.airlineIcao ?? 'Cargo';
  const airlineIata = airlineInfo?.iata;
  return (
    <GlassPanel className="p-3 cursor-pointer hover:bg-[var(--primary)]/8 transition-colors" onClick={onTrack}>
      <div className="flex items-center justify-between">
        <LeftSide aircraft={aircraft} operatorName={operatorName} airlineIata={airlineIata} />
        <RightSide aircraft={aircraft} altitudeUnit={altitudeUnit} speedUnit={speedUnit} />
      </div>
      <CargoRouteRow depIata={aircraft.depIata} arrIata={aircraft.arrIata} />
    </GlassPanel>
  );
}
