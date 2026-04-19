'use client';

import { useRouter } from 'next/navigation';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useFlightStore } from '@/lib/stores/flightStore';
import { t } from '@/lib/i18n/translations';
import { FlightRow } from '@/app/airlines/[icao]/FlightRow';
import type { AirlineFlight } from '@/app/airlines/[icao]/airlineTypes';
import type { AppLanguage } from '@/lib/types';

interface Props {
  flights: AirlineFlight[];
  language: AppLanguage;
  noDataLoading: boolean;
}

function isLiveStatus(status: string): boolean {
  return status === 'en-route' || status === 'active';
}

function EmptyBox({ loading }: { loading: boolean }) {
  return (
    <GlassPanel className="p-6 text-center">
      <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">
        {loading ? 'Flugdaten werden geladen...' : 'Keine Flüge gefunden'}
      </p>
    </GlassPanel>
  );
}

/** Flights heading + rows. Each row navigates to the map when the flight is live. */
export function FlightsSection({ flights, language, noDataLoading }: Props) {
  const router = useRouter();
  const aircraftMap = useFlightStore((s) => s.aircraftMap);
  const selectAircraft = useFlightStore((s) => s.selectAircraft);

  const selectByCallsign = (prefix: string) => {
    const ac = Array.from(aircraftMap.values()).find((a) => a.callsign?.startsWith(prefix));
    if (ac) {
      selectAircraft(ac);
      router.push('/');
    }
  };

  return (
    <div>
      <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
        {t('flights_upper', language)} ({flights.length})
      </h3>
      {flights.length === 0 ? (
        <EmptyBox loading={noDataLoading} />
      ) : (
        <div className="space-y-2">
          {flights.map((f, i) => (
            <FlightRow
              key={`${f.flightIcao}-${i}`}
              flight={f}
              isLive={isLiveStatus(f.status)}
              onClick={() => selectByCallsign(f.flightIcao.slice(0, 6))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
