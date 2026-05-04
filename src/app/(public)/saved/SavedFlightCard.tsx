'use client';

import { Plane, Pin, PinOff, X, ArrowRight } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { t } from '@/lib/i18n/translations';
import { resolveAirline, getAirlineLogoUrl } from '@/lib/data/airlines';
import { airportCity } from '@/lib/data/airports';
import { localizeCity } from '@/lib/data/city-translations';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import type { AircraftState, AltitudeUnit, AppLanguage, FavoriteItem, SpeedUnit } from '@/lib/types';
import { formatDate } from '@/app/(public)/saved/formatDate';

interface Props {
  item: FavoriteItem;
  liveData: AircraftState | undefined;
  language: AppLanguage;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  onRemove: () => void;
  onPin: () => void;
  onTrack: () => void;
}

/** Saved-flight card with live data (altitude/speed) when the aircraft is active. */
export function SavedFlightCard({
  item, liveData, language, altitudeUnit, speedUnit, onRemove, onPin, onTrack,
}: Props) {
  const airlineInfo = resolveAirline(item.label);
  const airlineIata = airlineInfo?.iata ?? item.airlineIata;
  const airlineName = airlineInfo?.name ?? item.airlineName ?? '';
  const displayCallsign = airlineIata && item.label.length > 3
    ? `${airlineIata}${item.label.slice(3)}`
    : item.label;
  const depIata = liveData?.depIata ?? item.depIata;
  const arrIata = liveData?.arrIata ?? item.arrIata;
  const depCity = depIata ? localizeCity(airportCity(depIata), language) : '';
  const arrCity = arrIata ? localizeCity(airportCity(arrIata), language) : '';
  const country = liveData?.originCountry ?? item.originCountry;
  const isLive = liveData && !liveData.onGround;

  return (
    <GlassPanel className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={onTrack}>
          {airlineIata ? (
            <div className="w-12 h-6 bg-white rounded shrink-0 shadow-sm overflow-hidden flex items-center justify-center px-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getAirlineLogoUrl(airlineIata, 'sm')}
                alt={airlineName}
                className="max-w-full max-h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
              />
            </div>
          ) : (
            <Plane size={14} className="text-[var(--success)] shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-[var(--font-heading)] text-sm font-bold text-[var(--primary)]">
                {displayCallsign}
              </span>
              {isLive && <StatusBadge status="en-route" />}
              {liveData?.onGround && <StatusBadge status="landed" />}
              {!liveData && (
                <span className="text-[8px] font-[var(--font-heading)] px-1 py-0.5 rounded bg-[var(--text-muted)]/10 text-[var(--text-muted)]">
                  OFFLINE
                </span>
              )}
            </div>
            {airlineName && (
              <span className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate block">
                {airlineName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {liveData && (
            <div className="text-right mr-2">
              <div className="text-[10px] font-[var(--font-heading)] font-bold text-[var(--accent)]">
                {formatAltitude(liveData.baroAltitude, altitudeUnit)}
              </div>
              <div className="text-[9px] text-[var(--text-muted)]">
                {formatSpeed(liveData.velocity, speedUnit)}
              </div>
            </div>
          )}
          <button onClick={onPin} className="p-1.5 rounded-lg hover:bg-[var(--primary)]/10 transition-colors" title="Pin">
            {item.pinned
              ? <Pin size={13} className="text-[var(--warning)] fill-[var(--warning)]" />
              : <PinOff size={13} className="text-[var(--text-muted)]" />}
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors" title={t('remove', language)}>
            <X size={13} />
          </button>
        </div>
      </div>

      {(depIata || arrIata) && (
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--glass-border)] cursor-pointer" onClick={onTrack}>
          {depIata && (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {country && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/flags/${country.toLowerCase()}.svg`} alt=""
                  className="w-4 h-3 rounded-sm object-cover shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
              <span className="font-[var(--font-heading)] text-[10px] font-bold text-[var(--success)]">{depIata}</span>
              {depCity && <span className="text-[9px] text-[var(--text-muted)] truncate">{depCity}</span>}
            </div>
          )}
          <ArrowRight size={10} className="text-[var(--text-muted)] shrink-0" />
          {arrIata && (
            <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
              {arrCity && <span className="text-[9px] text-[var(--text-muted)] truncate">{arrCity}</span>}
              <span className="font-[var(--font-heading)] text-[10px] font-bold text-[var(--accent)]">{arrIata}</span>
            </div>
          )}
        </div>
      )}

      <div className="text-[8px] text-[var(--text-muted)] font-[var(--font-body)]">
        {t('saved_on', language)} {formatDate(item.addedAt, language)}
      </div>
    </GlassPanel>
  );
}
