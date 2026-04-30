'use client';

import { useState, useMemo, useEffect } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useFlightStore } from '@/lib/stores/flightStore';
import { PageContainer, FadeIn, ScaleIn } from '@/components/ui';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { haversineDistance } from '@/lib/utils';
import { resolveAirline } from '@/lib/data/airlines';
import { airportCoords } from '@/lib/data/airports';
import { t } from '@/lib/i18n/translations';
import type { AircraftState } from '@/lib/types';
import { Search, ArrowLeftRight } from 'lucide-react';

function ComparisonRow({ label, valueA, valueB, unit, higherIsBetter = true }: {
  label: string; valueA: number | null; valueB: number | null; unit?: string; higherIsBetter?: boolean;
}) {
  const a = valueA ?? 0;
  const b = valueB ?? 0;
  const max = Math.max(a, b, 1);
  const pctA = (a / max) * 100;
  const pctB = (b / max) * 100;
  const colorA = (higherIsBetter ? a >= b : a <= b) ? 'var(--success)' : 'var(--text-muted)';
  const colorB = (higherIsBetter ? b >= a : b <= a) ? 'var(--success)' : 'var(--text-muted)';

  return (
    <div className="py-2">
      <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-[var(--font-heading)] font-bold w-16 text-right" style={{ color: colorA }}>
          {valueA != null ? `${valueA}${unit ?? ''}` : '--'}
        </span>
        <div className="flex-1 flex gap-0.5 h-3">
          <div className="flex-1 flex justify-end"><div className="h-full rounded-l" style={{ width: `${pctA}%`, backgroundColor: colorA, opacity: 0.6 }} /></div>
          <div className="flex-1"><div className="h-full rounded-r" style={{ width: `${pctB}%`, backgroundColor: colorB, opacity: 0.6 }} /></div>
        </div>
        <span className="text-xs font-[var(--font-heading)] font-bold w-16" style={{ color: colorB }}>
          {valueB != null ? `${valueB}${unit ?? ''}` : '--'}
        </span>
      </div>
    </div>
  );
}

function FlightPicker({ value, onSelect, onClear, aircraftMap, language }: {
  value: AircraftState | null;
  onSelect: (ac: AircraftState) => void;
  onClear: () => void;
  aircraftMap: Map<string, AircraftState>;
  language: import('@/lib/types').AppLanguage;
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
    const info = resolveAirline(value.callsign ?? '');
    return (
      <GlassPanel className="p-3 text-center">
        <div className="font-[var(--font-heading)] text-lg font-bold text-[var(--primary)]">{value.callsign ?? value.icao24}</div>
        {info && <div className="text-xs text-[var(--text-secondary)]">{info.name}</div>}
        {value.depIata && value.arrIata && <div className="text-xs text-[var(--text-muted)] mt-1">{value.depIata} → {value.arrIata}</div>}
        <button onClick={onClear} className="text-[9px] text-[var(--error)] mt-2 cursor-pointer">{t('remove', language)}</button>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-2">
      <GlassPanel className="flex items-center gap-2 px-3 py-2">
        <Search size={14} className="text-[var(--text-muted)]" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search_flights', language)}
          className="flex-1 bg-transparent text-sm font-[var(--font-body)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none" />
      </GlassPanel>
      {results.map((ac) => (
        <GlassPanel key={ac.icao24} className="p-2 cursor-pointer hover:bg-[var(--primary)]/8" onClick={() => { onSelect(ac); setSearch(''); }}>
          <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--primary)]">{ac.callsign ?? ac.icao24}</span>
          {ac.depIata && ac.arrIata && <span className="text-[10px] text-[var(--text-muted)] ml-2">{ac.depIata}→{ac.arrIata}</span>}
        </GlassPanel>
      ))}
    </div>
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

  return (
    <PageContainer
      maxWidth="3xl"
      title="Compare Flights"
      subtitle={
        flightA && flightB ? (
          <span className="badge badge-success">2 flights · ready to compare</span>
        ) : (
          <span className="badge">{flightA || flightB ? '1' : '0'}/2 selected</span>
        )
      }
    >
      <FadeIn>
        <div className="grid grid-cols-2 gap-3">
          <FlightPicker
            value={flightA}
            onSelect={setFlightA}
            onClear={() => setFlightA(null)}
            aircraftMap={aircraftMap}
            language={language}
          />
          <FlightPicker
            value={flightB}
            onSelect={setFlightB}
            onClear={() => setFlightB(null)}
            aircraftMap={aircraftMap}
            language={language}
          />
        </div>
      </FadeIn>

      {flightA && flightB && (
        <ScaleIn delay={120}>
          <GlassPanel className="p-4 space-y-1 mt-4">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="font-[var(--font-heading)] text-sm font-bold text-[var(--primary-bright)]">{flightA.callsign}</span>
              <ArrowLeftRight size={14} className="text-[var(--text-muted)]" />
              <span className="font-[var(--font-heading)] text-sm font-bold text-[var(--accent)]">{flightB.callsign}</span>
            </div>
            <ComparisonRow label={t('alt_label', language)} valueA={altA} valueB={altB} unit=" ft" />
            <ComparisonRow label={t('spd_label', language)} valueA={spdA} valueB={spdB} unit=" kts" />
            <ComparisonRow label="DISTANCE" valueA={distA} valueB={distB} unit=" km" higherIsBetter={false} />
          </GlassPanel>
        </ScaleIn>
      )}
    </PageContainer>
  );
}
