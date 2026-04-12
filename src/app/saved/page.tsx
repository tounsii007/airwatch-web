'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NeonText } from '@/components/ui/NeonText';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useFavoritesStore } from '@/lib/stores/favoritesStore';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { resolveAirline, getAirlineLogoUrl, AIRLINES } from '@/lib/data/airlines';
import { airportCity, airportCountry } from '@/lib/data/airports';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import type { AircraftState, FavoriteItem } from '@/lib/types';
import { Plane, Radio, Building2, Star, X, Pin, PinOff, ChevronUp, ArrowRight, MapPin } from 'lucide-react';

function getIcon(type: FavoriteItem['type']) {
  switch (type) {
    case 'flight': return <Plane size={14} className="text-[var(--success)]" />;
    case 'airport': return <Radio size={14} className="text-[var(--info)]" />;
    case 'airline': return <Building2 size={14} className="text-[var(--accent)]" />;
  }
}

function getTypeLabel(type: FavoriteItem['type'], language: string) {
  switch (type) {
    case 'flight': return t('flight', language);
    case 'airport': return t('airport', language);
    case 'airline': return t('airline', language);
  }
}

function formatDate(ts: number, language: string): string {
  const localeMap: Record<string, string> = { en: 'en-GB', de: 'de-DE', fr: 'fr-FR' };
  return new Date(ts).toLocaleDateString(localeMap[language] ?? 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Flight card with live data from flightStore */
function SavedFlightCard({
  item,
  liveData,
  language,
  altitudeUnit,
  speedUnit,
  onRemove,
  onPin,
  onTrack,
}: {
  item: FavoriteItem;
  liveData: AircraftState | undefined;
  language: string;
  altitudeUnit: string;
  speedUnit: string;
  onRemove: () => void;
  onPin: () => void;
  onTrack: () => void;
}) {
  const airlineInfo = resolveAirline(item.label);
  const airlineIata = airlineInfo?.iata ?? item.airlineIata;
  const airlineName = airlineInfo?.name ?? item.airlineName ?? '';
  const displayCallsign = airlineIata && item.label.length > 3
    ? `${airlineIata}${item.label.slice(3)}`
    : item.label;
  const depIata = liveData?.depIata ?? item.depIata;
  const arrIata = liveData?.arrIata ?? item.arrIata;
  const depCity = depIata ? airportCity(depIata) : '';
  const arrCity = arrIata ? airportCity(arrIata) : '';
  const country = liveData?.originCountry ?? item.originCountry;
  const isLive = liveData && !liveData.onGround;

  return (
    <GlassPanel className="p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer" onClick={onTrack}>
          {airlineIata ? (
            <div className="w-12 h-6 bg-white rounded shrink-0 shadow-sm overflow-hidden flex items-center justify-center px-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getAirlineLogoUrl(airlineIata, 'sm')} alt={airlineName} className="max-w-full max-h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
            </div>
          ) : (
            <Plane size={14} className="text-[var(--success)] shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-[var(--font-heading)] text-sm font-bold text-[var(--primary)]">{displayCallsign}</span>
              {isLive && <StatusBadge status="en-route" />}
              {liveData?.onGround && <StatusBadge status="landed" />}
              {!liveData && <span className="text-[8px] font-[var(--font-heading)] px-1 py-0.5 rounded bg-[var(--text-muted)]/10 text-[var(--text-muted)]">OFFLINE</span>}
            </div>
            {airlineName && <span className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate block">{airlineName}</span>}
          </div>
        </div>

        {/* Right: live data + actions */}
        <div className="flex items-center gap-1 shrink-0">
          {liveData && (
            <div className="text-right mr-2">
              <div className="text-[10px] font-[var(--font-heading)] font-bold text-[var(--accent)]">
                {formatAltitude(liveData.baroAltitude, altitudeUnit as 'feet' | 'meters')}
              </div>
              <div className="text-[9px] text-[var(--text-muted)]">
                {formatSpeed(liveData.velocity, speedUnit as 'knots' | 'kmh' | 'mph')}
              </div>
            </div>
          )}
          <button onClick={onPin} className="p-1.5 rounded-lg hover:bg-[var(--primary)]/10 transition-colors" title="Pin">
            {item.pinned ? <Pin size={13} className="text-[var(--warning)] fill-[var(--warning)]" /> : <PinOff size={13} className="text-[var(--text-muted)]" />}
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors" title={t('remove', language)}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Route row */}
      {(depIata || arrIata) && (
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--glass-border)] cursor-pointer" onClick={onTrack}>
          {depIata && (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {country && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/flags/${country.toLowerCase()}.svg`} alt="" className="w-4 h-3 rounded-sm object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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

      {/* Footer: date */}
      <div className="text-[8px] text-[var(--text-muted)] font-[var(--font-body)]">
        {t('saved_on', language)} {formatDate(item.addedAt, language)}
      </div>
    </GlassPanel>
  );
}

/** Airport card with flag and city */
function SavedAirportCard({ item, language, onRemove, onPin }: { item: FavoriteItem; language: string; onRemove: () => void; onPin: () => void }) {
  const iata = item.label;
  const country = airportCountry(iata);
  const city = airportCity(iata);
  return (
    <GlassPanel className="p-3">
      <div className="flex items-center justify-between">
        <Link href={`/airports/${iata}`} className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Flag + icon */}
          <div className="relative shrink-0">
            {country ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/flags/${country.toLowerCase()}.svg`} alt="" className="w-8 h-6 rounded-sm object-cover shadow-sm" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <MapPin size={20} className="text-[var(--info)]" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-[var(--font-heading)] text-base font-bold text-[var(--primary)]">{iata}</span>
              <span className="text-[8px] font-[var(--font-heading)] font-bold px-1 py-0.5 rounded bg-[var(--info)]/10 text-[var(--info)]">
                {t('airport', language)}
              </span>
            </div>
            {item.subtitle && <p className="text-[10px] text-[var(--text-primary)] font-[var(--font-body)] truncate font-medium">{item.subtitle}</p>}
            {city && <p className="text-[9px] text-[var(--text-secondary)] font-[var(--font-body)]">{city}</p>}
          </div>
        </Link>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onPin} className="p-1.5 rounded-lg hover:bg-[var(--primary)]/10 transition-colors">
            {item.pinned ? <Pin size={13} className="text-[var(--warning)] fill-[var(--warning)]" /> : <PinOff size={13} className="text-[var(--text-muted)]" />}
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>
      <p className="text-[8px] text-[var(--text-muted)] font-[var(--font-body)] mt-1.5">{t('saved_on', language)} {formatDate(item.addedAt, language)}</p>
    </GlassPanel>
  );
}

/** Airline card with logo and country */
function SavedAirlineCard({ item, language, onRemove, onPin }: { item: FavoriteItem; language: string; onRemove: () => void; onPin: () => void }) {
  // Extract ICAO from id (format: "airline-TAR") or fall back to label
  const icao = item.id.startsWith('airline-') ? item.id.slice(8) : item.label;
  const info = AIRLINES[icao] ?? AIRLINES[item.label];
  const iata = info?.iata;
  const name = info?.name ?? item.subtitle ?? icao;
  const country = info?.country;
  return (
    <GlassPanel className="p-3">
      <div className="flex items-center justify-between">
        <Link href={`/airlines/${icao}`} className="flex items-center gap-2.5 flex-1 min-w-0">
          {iata ? (
            <div className="w-14 h-7 bg-white rounded shrink-0 shadow-sm overflow-hidden flex items-center justify-center px-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getAirlineLogoUrl(iata, 'sm')} alt={name} className="max-w-full max-h-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
            </div>
          ) : (
            <Building2 size={20} className="text-[var(--accent)] shrink-0" />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">{name}</span>
              <span className="text-[8px] font-[var(--font-heading)] font-bold px-1 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                {t('airline', language)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-[var(--text-secondary)] font-[var(--font-body)]">
              {iata && <span>IATA: {iata}</span>}
              <span>ICAO: {icao}</span>
              {country && <span>· {country}</span>}
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={onPin} className="p-1.5 rounded-lg hover:bg-[var(--primary)]/10 transition-colors">
            {item.pinned ? <Pin size={13} className="text-[var(--warning)] fill-[var(--warning)]" /> : <PinOff size={13} className="text-[var(--text-muted)]" />}
          </button>
          <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors">
            <X size={13} />
          </button>
        </div>
      </div>
      <p className="text-[8px] text-[var(--text-muted)] font-[var(--font-body)] mt-1.5">{t('saved_on', language)} {formatDate(item.addedAt, language)}</p>
    </GlassPanel>
  );
}

export default function SavedPage() {
  const { items, removeFavorite, togglePin } = useFavoritesStore();
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const startPolling = useFlightStore((s) => s.startPolling);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const language = useSettingsStore((s) => s.language);
  const altitudeUnit = useSettingsStore((s) => s.altitudeUnit);
  const speedUnit = useSettingsStore((s) => s.speedUnit);
  const router = useRouter();

  // Start polling if no data yet
  useEffect(() => {
    if (aircraftMap.size === 0) startPolling();
  }, [aircraftMap.size, startPolling]);

  // Sort: pinned first, then by addedAt (newest first)
  const sorted = useMemo(() =>
    [...items].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.addedAt - a.addedAt;
    }),
  [items]);

  const pinned = sorted.filter((i) => i.pinned);
  const flights = sorted.filter((i) => i.type === 'flight' && !i.pinned);
  const airports = sorted.filter((i) => i.type === 'airport' && !i.pinned);
  const airlines = sorted.filter((i) => i.type === 'airline' && !i.pinned);

  // Match saved flights to live data by icao24 (item.id is the icao24)
  const getLiveData = (item: FavoriteItem): AircraftState | undefined => {
    return aircraftMap.get(item.id);
  };

  const handleTrack = (item: FavoriteItem) => {
    const live = getLiveData(item);
    if (live) {
      selectAircraft(live);
      router.push('/');
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('saved', language)} size="text-xl" />
      </div>

      {items.length === 0 ? (
        <GlassPanel className="p-8 text-center">
          <Star size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="text-sm text-[var(--text-secondary)] font-[var(--font-body)]">{t('no_favorites_saved', language)}</p>
          <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)] mt-1">{t('mark_favorites_hint', language)}</p>
        </GlassPanel>
      ) : (
        <>
          {/* Pinned section */}
          {pinned.length > 0 && (
            <div>
              <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--warning)] tracking-widest mb-2 flex items-center gap-1">
                <Pin size={10} /> PINNED ({pinned.length})
              </h3>
              <div className="space-y-2">
                {pinned.map((item) =>
                  item.type === 'flight' ? (
                    <SavedFlightCard key={item.id} item={item} liveData={getLiveData(item)} language={language} altitudeUnit={altitudeUnit} speedUnit={speedUnit}
                      onRemove={() => removeFavorite(item.id)} onPin={() => togglePin(item.id)} onTrack={() => handleTrack(item)} />
                  ) : item.type === 'airport' ? (
                    <SavedAirportCard key={item.id} item={item} language={language} onRemove={() => removeFavorite(item.id)} onPin={() => togglePin(item.id)} />
                  ) : (
                    <SavedAirlineCard key={item.id} item={item} language={language} onRemove={() => removeFavorite(item.id)} onPin={() => togglePin(item.id)} />
                  )
                )}
              </div>
            </div>
          )}

          {/* Flights section */}
          {flights.length > 0 && (
            <div>
              <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
                {t('flights_upper', language)} ({flights.length})
              </h3>
              <div className="space-y-2">
                {flights.map((item) => (
                  <SavedFlightCard key={item.id} item={item} liveData={getLiveData(item)} language={language} altitudeUnit={altitudeUnit} speedUnit={speedUnit}
                    onRemove={() => removeFavorite(item.id)} onPin={() => togglePin(item.id)} onTrack={() => handleTrack(item)} />
                ))}
              </div>
            </div>
          )}

          {/* Airports section */}
          {airports.length > 0 && (
            <div>
              <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
                {t('airports', language)} ({airports.length})
              </h3>
              <div className="space-y-2">
                {airports.map((item) => (
                  <SavedAirportCard key={item.id} item={item} language={language} onRemove={() => removeFavorite(item.id)} onPin={() => togglePin(item.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Airlines section */}
          {airlines.length > 0 && (
            <div>
              <h3 className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
                {t('airlines', language)} ({airlines.length})
              </h3>
              <div className="space-y-2">
                {airlines.map((item) => (
                  <SavedAirlineCard key={item.id} item={item} language={language} onRemove={() => removeFavorite(item.id)} onPin={() => togglePin(item.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Scroll to top */}
          {items.length > 5 && (
            <div className="flex justify-center pt-2">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors cursor-pointer">
                <ChevronUp size={12} /> TOP
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
