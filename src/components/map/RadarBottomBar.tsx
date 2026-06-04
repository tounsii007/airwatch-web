'use client';

import { useMemo } from 'react';
import { Plane, TrendingUp } from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { resolveAirline } from '@/lib/data/airlines';
import { getAirportRecord } from '@/lib/data/airportIndex';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AirlineLogo } from '@/components/flight/details/AirlineLogo';
import type { AircraftState } from '@/lib/types';

const M_TO_FT = 3.28084;
const MS_TO_KTS = 1.94384;

function altFt(m?: number) {
  return m == null ? null : Math.round((m * M_TO_FT) / 100) * 100;
}
function spdKts(ms?: number) {
  return ms == null ? null : Math.round(ms * MS_TO_KTS);
}

/** "Notability" score — surfaces airborne flights with a callsign and a known
 *  route first, so the table reads like a live departures board rather than a
 *  random sample of blips. */
function score(a: AircraftState): number {
  let s = 0;
  if (a.callsign) s += 2;
  if (a.depIata && a.arrIata) s += 3;
  if (!a.onGround) s += 1;
  s += Math.min(2, (a.velocity ?? 0) / 200);
  return s;
}

interface DerivedRow {
  ac: AircraftState;
  flight: string;
  airlineName: string;
  airlineIata?: string;
  route: string;
  alt: number | null;
  spd: number | null;
}

export function RadarBottomBar() {
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const selectedAircraft = useFlightStore((s) => s.selectedAircraft);

  const { rows, topAirports, total } = useMemo(() => {
    const all = Array.from(aircraftMap.values());

    // ── Recent flights (top by notability) ────────────────────────────────
    const ranked = [...all].sort((a, b) => score(b) - score(a) || (b.velocity ?? 0) - (a.velocity ?? 0));
    const rows: DerivedRow[] = ranked.slice(0, 7).map((ac) => {
      const al = ac.callsign ? resolveAirline(ac.callsign) : undefined;
      return {
        ac,
        flight: ac.callsign?.trim() || ac.icao24.toUpperCase(),
        airlineName: al?.name ?? '—',
        airlineIata: al?.iata,
        route: ac.depIata && ac.arrIata ? `${ac.depIata} → ${ac.arrIata}` : '—',
        alt: altFt(ac.baroAltitude),
        spd: spdKts(ac.velocity),
      };
    });

    // ── Top airports by live traffic (dep + arr frequency) ─────────────────
    const counts = new Map<string, number>();
    for (const ac of all) {
      if (ac.depIata) counts.set(ac.depIata, (counts.get(ac.depIata) ?? 0) + 1);
      if (ac.arrIata) counts.set(ac.arrIata, (counts.get(ac.arrIata) ?? 0) + 1);
    }
    const topAirports = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([iata, n]) => ({ iata, n, name: getAirportRecord(iata)?.n ?? iata }));
    const maxN = topAirports[0]?.n ?? 1;

    return { rows, topAirports: topAirports.map((a) => ({ ...a, pct: a.n / maxN })), total: all.length };
  }, [aircraftMap]);

  if (total === 0) return null;

  return (
    <div
      className={`pointer-events-none absolute left-3 right-3 bottom-3 z-[900] hidden lg:flex gap-3 transition-[right] duration-300 ${
        selectedAircraft ? 'lg:right-[432px]' : 'lg:right-3'
      }`}
    >
      {/* ── Recent flights ──────────────────────────────────────────────── */}
      <div className="glass-panel-elevated pointer-events-auto flex-1 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="t-label uppercase tracking-wider text-[var(--text-secondary)]">Recent Flights</span>
            <span className="flex items-center gap-1 t-meta text-[var(--secondary)]">
              <span className="inline-flex h-1.5 w-1.5 animate-pulse-glow rounded-full bg-[var(--secondary)]" />
              Live
            </span>
          </div>
        </div>
        <div className="max-h-[150px] overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="t-meta uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-1.5 font-medium">Flight</th>
                <th className="px-2 py-1.5 font-medium">Airline</th>
                <th className="px-2 py-1.5 font-medium">Route</th>
                <th className="px-2 py-1.5 text-right font-medium">Alt</th>
                <th className="px-2 py-1.5 text-right font-medium">Spd</th>
                <th className="px-4 py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.ac.icao24}
                  onClick={() => selectAircraft(r.ac)}
                  className="cursor-pointer border-t border-[var(--glass-border)]/60 transition-colors hover:bg-[var(--primary)]/5"
                >
                  <td className="px-4 py-1.5 t-data font-semibold text-[var(--primary-bright)]">{r.flight}</td>
                  <td className="px-2 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <AirlineLogo airlineIata={r.airlineIata} size="sm" />
                      <span className="t-body max-w-[120px] truncate text-[var(--text-secondary)]">{r.airlineName}</span>
                    </span>
                  </td>
                  <td className="px-2 py-1.5 t-data text-[var(--text-secondary)]">{r.route}</td>
                  <td className="px-2 py-1.5 text-right t-data text-[var(--text-secondary)]">
                    {r.alt != null ? `${r.alt.toLocaleString()} ft` : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-right t-data text-[var(--text-secondary)]">
                    {r.spd != null ? `${r.spd} kts` : '—'}
                  </td>
                  <td className="px-4 py-1.5">
                    <StatusBadge status={r.ac.flightStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Top airports by traffic ─────────────────────────────────────── */}
      <div className="glass-panel-elevated pointer-events-auto w-[320px] shrink-0 overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4 py-2.5">
          <span className="t-label uppercase tracking-wider text-[var(--text-secondary)]">Top Airports by Traffic</span>
          <TrendingUp size={13} className="text-[var(--primary)]" aria-hidden />
        </div>
        <div className="space-y-1.5 px-3 py-2.5">
          {topAirports.map((a, i) => (
            <div key={a.iata} className="flex items-center gap-2.5">
              <span className="t-data w-4 text-right text-[var(--text-muted)]">{i + 1}</span>
              <span className="t-data w-9 font-semibold text-[var(--primary-bright)]">{a.iata}</span>
              <span className="t-body min-w-0 flex-1 truncate text-[var(--text-secondary)]">{a.name}</span>
              <div className="relative h-1 w-12 overflow-hidden rounded-full bg-[var(--surface-light)]">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${a.pct * 100}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }}
                />
              </div>
              <span className="t-data w-8 text-right text-[var(--text-primary)]">{a.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
