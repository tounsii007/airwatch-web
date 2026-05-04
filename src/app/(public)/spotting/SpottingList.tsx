'use client';

import { Binoculars, MapPin } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import type { AircraftState, AltitudeUnit, AppLanguage } from '@/lib/types';
import { SpottingCard } from '@/app/(public)/spotting/SpottingCard';
import type { SpottingEntry } from '@/app/(public)/spotting/spottingTypes';

interface Props {
  entries: SpottingEntry[];
  userLat: number | null;
  geoError: string | null;
  altitudeUnit: AltitudeUnit;
  language: AppLanguage;
  onTrack: (ac: AircraftState) => void;
  onRetryGeo: () => void;
}

function GeoPrompt({ geoError, onRetry, language }: { geoError: string | null; onRetry: () => void; language: AppLanguage }) {
  return (
    <GlassPanel className="p-6 text-center space-y-3">
      <MapPin size={28} className="mx-auto text-[var(--text-muted)]" />
      <p className="text-sm text-[var(--text-muted)] font-[var(--font-body)]">{geoError ?? t('geo_loading', language)}</p>
      {geoError && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 transition-colors cursor-pointer"
        >
          {t('retry', language)}
        </button>
      )}
    </GlassPanel>
  );
}

function EmptyBox({ language }: { language: AppLanguage }) {
  return (
    <GlassPanel className="p-6 text-center space-y-2">
      <Binoculars size={28} className="mx-auto text-[var(--text-muted)]" />
      <p className="text-sm text-[var(--text-muted)] font-[var(--font-body)]">{t('no_rare_nearby', language)}</p>
      <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)] opacity-70">{t('spotting_hint', language)}</p>
    </GlassPanel>
  );
}

function Heading({ count, language }: { count: number; language: AppLanguage }) {
  return (
    <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
      {t('spotted_nearby', language)}
      {count > 0 && <span className="ml-2 text-[var(--primary)]">{count}</span>}
    </h3>
  );
}

/** List of nearby rare-aircraft entries with geo-prompt and empty state. */
export function SpottingList({ entries, userLat, geoError, altitudeUnit, language, onTrack, onRetryGeo }: Props) {
  return (
    <div>
      <Heading count={entries.length} language={language} />
      {userLat == null ? (
        <GeoPrompt geoError={geoError} onRetry={onRetryGeo} language={language} />
      ) : entries.length === 0 ? (
        <EmptyBox language={language} />
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <SpottingCard
              key={e.aircraft.icao24}
              entry={e}
              altitudeUnit={altitudeUnit}
              language={language}
              onTrack={() => onTrack(e.aircraft)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
