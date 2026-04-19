'use client';

import { ChevronUp, Package } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AircraftState, AltitudeUnit, AppLanguage, SpeedUnit } from '@/lib/types';
import { CargoCard } from '@/app/cargo/CargoCard';

interface Props {
  flights: AircraftState[];
  totalLoaded: boolean;
  hasSearch: boolean;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  language: AppLanguage;
  onTrack: (ac: AircraftState) => void;
}

function Heading({ count, language }: { count: number; language: AppLanguage }) {
  return (
    <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
      {t('cargo_flights', language)}
      {count > 0 && <span className="ml-2 text-[var(--primary)]">{count}</span>}
    </h3>
  );
}

function LoadingBox({ language }: { language: AppLanguage }) {
  return (
    <GlassPanel className="p-6 text-center">
      <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">{t('loading_flight_data', language)}</p>
    </GlassPanel>
  );
}

function EmptyBox({ hasSearch, language }: { hasSearch: boolean; language: AppLanguage }) {
  return (
    <GlassPanel className="p-6 text-center space-y-2">
      <Package size={28} className="mx-auto text-[var(--text-muted)]" />
      <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">
        {hasSearch ? t('no_results', language) : t('no_cargo_flights', language)}
      </p>
      {!hasSearch && <p className="text-[var(--text-muted)] text-xs font-[var(--font-body)] opacity-70">{t('cargo_hint', language)}</p>}
    </GlassPanel>
  );
}

function Footer({ count, language }: { count: number; language: AppLanguage }) {
  if (count <= 10) return null;
  return (
    <div className="flex items-center justify-between pt-3">
      <span className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
        {count} {t('flights_count', language)}
      </span>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors cursor-pointer"
      >
        <ChevronUp size={12} /> TOP
      </button>
    </div>
  );
}

/** Cargo flights list with loading / empty state and back-to-top. */
export function CargoList({ flights, totalLoaded, hasSearch, altitudeUnit, speedUnit, language, onTrack }: Props) {
  return (
    <div>
      <Heading count={flights.length} language={language} />
      {!totalLoaded ? (
        <LoadingBox language={language} />
      ) : flights.length === 0 ? (
        <EmptyBox hasSearch={hasSearch} language={language} />
      ) : (
        <div className="space-y-2">
          {flights.map((ac) => (
            <CargoCard
              key={ac.icao24}
              aircraft={ac}
              altitudeUnit={altitudeUnit}
              speedUnit={speedUnit}
              onTrack={() => onTrack(ac)}
            />
          ))}
        </div>
      )}
      <Footer count={flights.length} language={language} />
    </div>
  );
}
