'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Binoculars, Crosshair, MapPin, Star } from 'lucide-react';
import { NeonText } from '@/components/ui/NeonText';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { haversineDistance, formatAltitude } from '@/lib/utils';
import { t } from '@/lib/i18n/translations';
import { resolveAirline } from '@/lib/data/airlines';
import type { AircraftState } from '@/lib/types';
import { useUserLocation } from '@/app/spotting/useUserLocation';

const TIER_COLORS = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

const TIER_LABELS = { 1: 'LEGENDARY', 2: 'RARE', 3: 'NOTABLE' };

interface SpottingEntry {
  aircraft: AircraftState;
  distance: number;
  rareInfo: { tier: number; label: string };
}

export default function SpottingPage() {
  const { aircraftMap, startPolling, selectAircraft } = useFlightStore();
  const { altitudeUnit, language } = useSettingsStore();
  const [maxRadius, setMaxRadius] = useState(500);
  const [geoRetry, setGeoRetry] = useState(0);
  const router = useRouter();
  const { userLat, userLon, geoError } = useUserLocation(language, geoRetry);

  useEffect(() => {
    if (aircraftMap.size === 0) startPolling();
  }, [aircraftMap.size, startPolling]);

  const entries = useMemo(() => {
    if (userLat == null || userLon == null) return [];
    const result: SpottingEntry[] = [];

    aircraftMap.forEach((aircraft) => {
      if (aircraft.latitude == null || aircraft.longitude == null || aircraft.onGround) return;
      const distance = haversineDistance(userLat, userLon, aircraft.latitude, aircraft.longitude);
      if (distance > maxRadius) return;

      const callsign = aircraft.callsign?.toUpperCase() ?? '';
      if (aircraft.category === 6) {
        result.push({ aircraft, distance, rareInfo: { tier: 3, label: 'Wide-body Airliner' } });
      }
      if (
        callsign.startsWith('RCH') || callsign.startsWith('DUKE') || callsign.startsWith('IRON') ||
        callsign.startsWith('GLEX') || callsign.startsWith('NAF') || callsign.startsWith('SAM') ||
        callsign.startsWith('RRR') || callsign.startsWith('GAF') || callsign.startsWith('IAM') ||
        callsign.startsWith('CASA') || callsign.startsWith('SPAR')
      ) {
        result.push({ aircraft, distance, rareInfo: { tier: 2, label: 'Military / Government' } });
      }
    });

    const deduped = new Map<string, SpottingEntry>();
    for (const entry of result) {
      const existing = deduped.get(entry.aircraft.icao24);
      if (!existing || entry.rareInfo.tier > existing.rareInfo.tier) {
        deduped.set(entry.aircraft.icao24, entry);
      }
    }

    return Array.from(deduped.values()).sort((a, b) => a.rareInfo.tier - b.rareInfo.tier || a.distance - b.distance);
  }, [aircraftMap, maxRadius, userLat, userLon]);

  const handleTrack = (aircraft: AircraftState) => {
    selectAircraft(aircraft);
    router.push('/');
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('spotting', language)} size="text-xl" />
      </div>

      <GlassPanel className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crosshair size={14} className="text-[var(--primary)]" />
          {userLat != null ? (
            <span className="text-xs font-[var(--font-body)] text-[var(--text-secondary)]">
              {userLat.toFixed(2)}°, {userLon?.toFixed(2)}°
            </span>
          ) : (
            <span className="text-xs font-[var(--font-body)] text-[var(--text-muted)]">
              {geoError ?? t('loading', language)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {[200, 500, 1000].map((radius) => (
            <button
              key={radius}
              onClick={() => setMaxRadius(radius)}
              className={`px-2 py-1 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider transition-colors cursor-pointer ${
                maxRadius === radius
                  ? 'bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30'
                  : 'text-[var(--text-muted)] border border-transparent'
              }`}
            >
              {radius}km
            </button>
          ))}
        </div>
      </GlassPanel>

      <div className="grid grid-cols-3 gap-2">
        {([1, 2, 3] as const).map((tier) => {
          const count = entries.filter((entry) => entry.rareInfo.tier === tier).length;
          return (
            <GlassPanel key={tier} className="p-3 text-center">
              <Star size={14} className="mx-auto mb-1" style={{ color: TIER_COLORS[tier] }} />
              <div className="text-lg font-[var(--font-heading)] font-bold" style={{ color: TIER_COLORS[tier] }}>
                {count}
              </div>
              <div className="text-[8px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
                {TIER_LABELS[tier]}
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <div>
        <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
          {t('spotted_nearby', language)}
          {entries.length > 0 && <span className="ml-2 text-[var(--primary)]">{entries.length}</span>}
        </h3>

        {userLat == null ? (
          <GlassPanel className="p-6 text-center space-y-3">
            <MapPin size={28} className="mx-auto text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)] font-[var(--font-body)]">
              {geoError ?? t('geo_loading', language)}
            </p>
            {geoError && (
              <button
                onClick={() => setGeoRetry((count) => count + 1)}
                className="px-4 py-2 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 transition-colors cursor-pointer"
              >
                {t('retry', language)}
              </button>
            )}
          </GlassPanel>
        ) : entries.length === 0 ? (
          <GlassPanel className="p-6 text-center space-y-2">
            <Binoculars size={28} className="mx-auto text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)] font-[var(--font-body)]">
              {t('no_rare_nearby', language)}
            </p>
            <p className="text-xs text-[var(--text-muted)] font-[var(--font-body)] opacity-70">
              {t('spotting_hint', language)}
            </p>
          </GlassPanel>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const { aircraft, distance, rareInfo } = entry;
              const tierColor = TIER_COLORS[rareInfo.tier as keyof typeof TIER_COLORS];
              const airlineInfo = resolveAirline(aircraft.callsign ?? '');

              return (
                <GlassPanel key={aircraft.icao24} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <Star size={12} style={{ color: tierColor, fill: tierColor }} />
                      <span className="text-[7px] font-[var(--font-heading)] tracking-wider" style={{ color: tierColor }}>
                        {TIER_LABELS[rareInfo.tier as keyof typeof TIER_LABELS]}
                      </span>
                    </div>
                    <div>
                      <div className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">
                        {aircraft.callsign || aircraft.icao24}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)]">
                        {rareInfo.label}
                        {airlineInfo && ` · ${airlineInfo.name}`}
                      </div>
                      {aircraft.depIata && aircraft.arrIata && (
                        <div className="text-[9px] text-[var(--text-muted)] font-[var(--font-body)]">
                          {`${aircraft.depIata} -> ${aircraft.arrIata}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <div className="text-xs font-[var(--font-heading)] text-[var(--accent)]">
                        {formatAltitude(aircraft.baroAltitude, altitudeUnit)}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">
                        {Math.round(distance)} km
                      </div>
                    </div>
                    <button
                      onClick={() => handleTrack(aircraft)}
                      className="px-2 py-1 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 transition-colors cursor-pointer"
                    >
                      {t('track', language)}
                    </button>
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
