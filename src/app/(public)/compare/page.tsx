'use client';

import { useState, useMemo, useEffect } from 'react';
import { ArrowLeftRight, Search, Plane, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { EmptyState } from '@/components/ui/EmptyState';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PageContainer, FadeIn, ScaleIn } from '@/components/ui';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { haversineDistance } from '@/lib/utils';
import { resolveAirline } from '@/lib/data/airlines';
import { airportCoords } from '@/lib/data/airports';
import { t } from '@/lib/i18n/translations';
import type { AircraftState, AppLanguage } from '@/lib/types';

/**
 * Two-flight comparison page. Adopts Card / Input / Button / EmptyState
 * primitives so the visual language matches /airlines, /stats, /settings.
 */

function ComparisonRow({ label, valueA, valueB, unit, higherIsBetter = true }: {
  label: string; valueA: number | null; valueB: number | null; unit?: string; higherIsBetter?: boolean;
}) {
  const a = valueA ?? 0;
  const b = valueB ?? 0;
  const max = Math.max(a, b, 1);
  const pctA = (a / max) * 100;
  const pctB = (b / max) * 100;
  const winsA = higherIsBetter ? a >= b : a <= b;
  const winsB = higherIsBetter ? b >= a : b <= a;
  const colorA = winsA ? 'var(--success)' : 'var(--text-muted)';
  const colorB = winsB ? 'var(--success)' : 'var(--text-muted)';

  return (
    <div className="py-2.5">
      <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider mb-1.5">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-[var(--font-heading)] font-bold w-16 text-right tabular" style={{ color: colorA }}>
          {valueA != null ? `${valueA}${unit ?? ''}` : '--'}
        </span>
        <div className="flex-1 flex gap-0.5 h-3">
          <div className="flex-1 flex justify-end overflow-hidden rounded-l">
            <div
              className="h-full rounded-l transition-all duration-500 ease-out"
              style={{ width: `${pctA}%`, backgroundColor: colorA, opacity: winsA ? 0.85 : 0.4 }}
            />
          </div>
          <div className="flex-1 overflow-hidden rounded-r">
            <div
              className="h-full rounded-r transition-all duration-500 ease-out"
              style={{ width: `${pctB}%`, backgroundColor: colorB, opacity: winsB ? 0.85 : 0.4 }}
            />
          </div>
        </div>
        <span className="text-xs font-[var(--font-heading)] font-bold w-16 tabular" style={{ color: colorB }}>
          {valueB != null ? `${valueB}${unit ?? ''}` : '--'}
        </span>
      </div>
    </div>
  );
}

function SelectedFlightCard({
  flight,
  onClear,
  language,
  slot,
}: {
  flight: AircraftState;
  onClear: () => void;
  language: AppLanguage;
  slot: 'A' | 'B';
}) {
  const info = resolveAirline(flight.callsign ?? '');
  const accent = slot === 'A' ? 'var(--primary-bright)' : 'var(--accent)';

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-md font-[var(--font-heading)] text-[10px]"
            style={{
              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
              color: accent,
            }}
          >
            {slot}
          </span>
          <span style={{ color: accent }}>{flight.callsign ?? flight.icao24}</span>
        </span>
      }
      action={
        <Button variant="ghost" size="sm" leadingIcon={<X size={12} />} onClick={onClear}>
          {t('remove', language)}
        </Button>
      }
      bare
      bodyClassName="px-4 pb-4 pt-2 space-y-1.5"
    >
      {info && (
        <p className="text-xs font-[var(--font-body)] text-[var(--text-secondary)] truncate">{info.name}</p>
      )}
      {flight.depIata && flight.arrIata && (
        <div className="flex items-center gap-1.5">
          <Tag variant="info" size="sm">{flight.depIata}</Tag>
          <span className="text-[var(--text-muted)] text-xs">→</span>
          <Tag variant="info" size="sm">{flight.arrIata}</Tag>
        </div>
      )}
    </Card>
  );
}

function FlightPicker({ value, onSelect, onClear, aircraftMap, language, slot }: {
  value: AircraftState | null;
  onSelect: (ac: AircraftState) => void;
  onClear: () => void;
  aircraftMap: Map<string, AircraftState>;
  language: AppLanguage;
  slot: 'A' | 'B';
}) {
  const [search, setSearch] = useState('');
  const results = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toUpperCase();
    const found: AircraftState[] = [];
    aircraftMap.forEach((ac) => {
      if (found.length >= 10) return;
      if (ac.callsign?.toUpperCase().includes(q) || ac.icao24.includes(q.toLowerCase())) {
        found.push(ac);
      }
    });
    return found;
  }, [search, aircraftMap]);

  if (value) {
    return <SelectedFlightCard flight={value} onClear={onClear} language={language} slot={slot} />;
  }

  const accent = slot === 'A' ? 'var(--primary-bright)' : 'var(--accent)';

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-md font-[var(--font-heading)] text-[10px]"
            style={{
              background: `color-mix(in srgb, ${accent} 18%, transparent)`,
              color: accent,
            }}
          >
            {slot}
          </span>
          <span className="text-[var(--text-muted)]">{t('search_flights', language)}</span>
        </span>
      }
      bare
      bodyClassName="px-4 pb-4 pt-2 space-y-2"
    >
      <Input
        value={search}
        onChange={setSearch}
        placeholder={t('search_flights', language)}
        leadingIcon={<Search size={14} />}
        size="sm"
        clearable
      />
      {search.length >= 2 && results.length === 0 && (
        <EmptyState
          icon={<Plane size={20} />}
          title={t('no_flights_found', language)}
          variant="default"
          bare
          className="py-4"
        />
      )}
      {results.length > 0 && (
        <div className="space-y-1.5">
          {results.map((ac) => (
            <button
              key={ac.icao24}
              type="button"
              onClick={() => { onSelect(ac); setSearch(''); }}
              className="w-full text-left glass-panel px-3 py-2 hover:bg-[var(--primary)]/8 transition-colors flex items-center gap-2"
            >
              <Plane size={12} className="text-[var(--primary)] shrink-0" />
              <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--primary)]">
                {ac.callsign ?? ac.icao24}
              </span>
              {ac.depIata && ac.arrIata && (
                <span className="text-[10px] text-[var(--text-muted)] ml-auto">{ac.depIata}→{ac.arrIata}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

export default function ComparePage() {
  const { aircraftMap, startPolling } = useFlightStore();
  const { language } = useSettingsStore();
  const [flightA, setFlightA] = useState<AircraftState | null>(null);
  const [flightB, setFlightB] = useState<AircraftState | null>(null);

  useEffect(() => { if (aircraftMap.size === 0) startPolling(); }, [aircraftMap.size, startPolling]);

  const getDistance = (ac: AircraftState | null): number | null => {
    if (!ac?.depIata || !ac?.arrIata) return null;
    const dep = airportCoords(ac.depIata);
    const arr = airportCoords(ac.arrIata);
    if (!dep || !arr) return null;
    return Math.round(haversineDistance(dep.lat, dep.lon, arr.lat, arr.lon));
  };

  const altA = flightA?.baroAltitude ? Math.round(flightA.baroAltitude * 3.28084) : null;
  const altB = flightB?.baroAltitude ? Math.round(flightB.baroAltitude * 3.28084) : null;
  const spdA = flightA?.velocity ? Math.round(flightA.velocity * 1.94384) : null;
  const spdB = flightB?.velocity ? Math.round(flightB.velocity * 1.94384) : null;
  const distA = getDistance(flightA);
  const distB = getDistance(flightB);

  const selectedCount = (flightA ? 1 : 0) + (flightB ? 1 : 0);

  return (
    <PageContainer
      maxWidth="3xl"
      title={t('compare_title', language)}
      subtitle={
        selectedCount === 2 ? (
          <Tag variant="success" size="sm">2 flights · ready to compare</Tag>
        ) : (
          <Tag variant="default" size="sm">{selectedCount}/2 selected</Tag>
        )
      }
    >
      <FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FlightPicker
            value={flightA}
            onSelect={setFlightA}
            onClear={() => setFlightA(null)}
            aircraftMap={aircraftMap}
            language={language}
            slot="A"
          />
          <FlightPicker
            value={flightB}
            onSelect={setFlightB}
            onClear={() => setFlightB(null)}
            aircraftMap={aircraftMap}
            language={language}
            slot="B"
          />
        </div>
      </FadeIn>

      {!flightA && !flightB && (
        <FadeIn delay={120}>
          <GlassPanel className="mt-4">
            <EmptyState
              icon={<ArrowLeftRight size={28} />}
              title="Pick two flights to start"
              body="Search above by callsign or ICAO24. The comparison panel appears once both slots are filled."
              variant="info"
              bare
              className="py-10"
            />
          </GlassPanel>
        </FadeIn>
      )}

      {flightA && flightB && (
        <ScaleIn delay={120}>
          <Card
            title={
              <span className="flex items-center justify-center gap-2 w-full">
                <span className="text-[var(--primary-bright)]">{flightA.callsign ?? flightA.icao24}</span>
                <ArrowLeftRight size={14} className="text-[var(--text-muted)]" />
                <span className="text-[var(--accent)]">{flightB.callsign ?? flightB.icao24}</span>
              </span>
            }
            className="mt-4"
            bare
            bodyClassName="px-4 pb-4 pt-2"
          >
            <ComparisonRow label={t('alt_label', language)} valueA={altA} valueB={altB} unit=" ft" />
            <ComparisonRow label={t('spd_label', language)} valueA={spdA} valueB={spdB} unit=" kts" />
            <ComparisonRow label="DISTANCE" valueA={distA} valueB={distB} unit=" km" higherIsBetter={false} />
          </Card>
        </ScaleIn>
      )}
    </PageContainer>
  );
}
