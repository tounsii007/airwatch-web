'use client';

import { useRouter } from 'next/navigation';
import { Loader2, Plane } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tag } from '@/components/ui/Tag';
import { useFlightStore } from '@/lib/stores/flightStore';
import { t } from '@/lib/i18n/translations';
import { FlightRow } from '@/app/(public)/airlines/[icao]/FlightRow';
import type { AirlineFlight } from '@/app/(public)/airlines/[icao]/airlineTypes';
import type { AppLanguage } from '@/lib/types';

interface Props {
  flights: AirlineFlight[];
  language: AppLanguage;
  noDataLoading: boolean;
}

function isLiveStatus(status: string): boolean {
  return status === 'en-route' || status === 'active';
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

  const badge = flights.length > 0 ? (
    <Tag variant="info" size="sm">{flights.length}</Tag>
  ) : undefined;

  return (
    <Card
      title={t('flights_upper', language)}
      badge={badge}
      bare
      bodyClassName="px-4 pb-4 pt-2"
    >
      {flights.length === 0 ? (
        noDataLoading ? (
          <EmptyState
            icon={<Loader2 size={24} className="animate-spin" />}
            title={t('loading_flight_data', language)}
            variant="info"
            bare
            className="py-6"
          />
        ) : (
          <EmptyState
            icon={<Plane size={24} />}
            title={t('no_flights_found', language)}
            variant="default"
            bare
            className="py-6"
          />
        )
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
    </Card>
  );
}
