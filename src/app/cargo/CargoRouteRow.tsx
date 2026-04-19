'use client';

import { ArrowRight } from 'lucide-react';
import { airportCity } from '@/lib/data/airports';
import { CargoRouteFlag } from '@/app/cargo/CargoRouteFlag';

interface Props {
  depIata?: string;
  arrIata?: string;
}

function DepSide({ iata }: { iata: string }) {
  const city = airportCity(iata);
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <CargoRouteFlag iata={iata} />
      <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--success)]">{iata}</span>
      {city && <span className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate">{city}</span>}
    </div>
  );
}

function ArrSide({ iata }: { iata: string }) {
  const city = airportCity(iata);
  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
      {city && <span className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate">{city}</span>}
      <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--accent)]">{iata}</span>
      <CargoRouteFlag iata={iata} />
    </div>
  );
}

/** Dep → Arr route strip with flags; renders nothing when both sides are missing. */
export function CargoRouteRow({ depIata, arrIata }: Props) {
  if (!depIata && !arrIata) return null;
  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--glass-border)]">
      {depIata && <DepSide iata={depIata} />}
      <ArrowRight size={12} className="text-[var(--text-muted)] shrink-0" />
      {arrIata && <ArrSide iata={arrIata} />}
    </div>
  );
}
