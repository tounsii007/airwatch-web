'use client';

import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatAltitude, formatSpeed, getAltitudeColor } from '@/lib/utils';
import { resolveAirline } from '@/lib/data/airlines';
import { localizeCountry } from '@/lib/data/country-translations';
import { t } from '@/lib/i18n/translations';
import type { AircraftState, AltitudeUnit, AppLanguage, SpeedUnit } from '@/lib/types';

interface Props {
  flights: AircraftState[];
  totalLoaded: boolean;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  language: AppLanguage;
}

function AltDot({ aircraft }: { aircraft: AircraftState }) {
  const color = getAltitudeColor(aircraft.baroAltitude, aircraft.onGround);
  return <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />;
}

function countryOrAirline(aircraft: AircraftState, language: AppLanguage): string {
  if (aircraft.originCountry) return localizeCountry(aircraft.originCountry, language);
  return resolveAirline(aircraft.callsign ?? '')?.name ?? t('unknown', language);
}

function Row({ aircraft, altitudeUnit, speedUnit, language }: Props & { aircraft: AircraftState }) {
  return (
    <GlassPanel className="p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AltDot aircraft={aircraft} />
        <div>
          <div className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">
            {aircraft.callsign || 'N/A'}
          </div>
          <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)]">
            {countryOrAirline(aircraft, language)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 text-right">
        <div>
          <div className="text-xs font-[var(--font-heading)] text-[var(--accent)]">{formatAltitude(aircraft.baroAltitude, altitudeUnit)}</div>
          <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">{formatSpeed(aircraft.velocity, speedUnit)}</div>
        </div>
        <StatusBadge status={aircraft.flightStatus} />
      </div>
    </GlassPanel>
  );
}

function EmptyBox({ loading, language }: { loading: boolean; language: AppLanguage }) {
  return (
    <GlassPanel className="p-6 text-center">
      <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">
        {loading ? t('loading_flight_data', language) : t('no_results', language)}
      </p>
    </GlassPanel>
  );
}

/** Recently-departed flights list (airborne below 10k ft). */
export function DeparturesList(props: Props) {
  return (
    <div>
      <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
        {t('last_departures', props.language)}
      </h3>
      {props.flights.length === 0 ? (
        <EmptyBox loading={!props.totalLoaded} language={props.language} />
      ) : (
        <div className="space-y-2">
          {props.flights.map((ac) => (
            <Row key={ac.icao24} {...props} aircraft={ac} />
          ))}
        </div>
      )}
    </div>
  );
}
