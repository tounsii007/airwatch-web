'use client';

import { ArrowUpDown, Gauge, Navigation } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import { DataCell, MiniCell, Tag } from '@/components/flight/details/primitives';
import { formatCoord, formatHeading, formatVerticalRateFpm, isEmergencySquawk, verticalRateColor } from '@/components/flight/details/flightDisplayUtils';
import type { AircraftState, AltitudeUnit, AppLanguage, SpeedUnit } from '@/lib/types';

interface Props {
  language: AppLanguage;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  aircraft: AircraftState;
  altColor?: string;
}

function PrimaryGrid({ language, altitudeUnit, speedUnit, aircraft, altColor }: Props) {
  const { baroAltitude, velocity, trueTrack, verticalRate } = aircraft;
  return (
    <div className="grid grid-cols-2 gap-2 p-4 border-b border-[var(--glass-border)]">
      <DataCell icon={<ArrowUpDown size={14} />} label={t('alt_label', language)} value={formatAltitude(baroAltitude, altitudeUnit)} color={altColor} />
      <DataCell icon={<Gauge size={14} />} label={t('spd_label', language)} value={formatSpeed(velocity, speedUnit)} color="var(--primary)" />
      <DataCell icon={<Navigation size={14} />} label={t('hdg_label', language)} value={formatHeading(trueTrack)} />
      <DataCell icon={<ArrowUpDown size={14} />} label={t('vs_label', language)} value={formatVerticalRateFpm(verticalRate, ' fpm')} color={verticalRateColor(verticalRate)} />
    </div>
  );
}

function CoordsRow({ language, aircraft }: { language: AppLanguage; aircraft: AircraftState }) {
  return (
    <div className="grid grid-cols-2 gap-2 px-4 py-3 border-b border-[var(--glass-border)]">
      <MiniCell label={t('lat_label', language)} value={formatCoord(aircraft.latitude)} color="#60A5FA" />
      <MiniCell label={t('lon_label', language)} value={formatCoord(aircraft.longitude)} color="#60A5FA" />
    </div>
  );
}

function SquawkRow({ language, squawk }: { language: AppLanguage; squawk?: string }) {
  if (!squawk) return null;
  return (
    <div className="px-4 py-2 border-b border-[var(--glass-border)] flex gap-2">
      <Tag label={t('squawk_label', language)} value={squawk} highlight={isEmergencySquawk(squawk)} />
    </div>
  );
}

/** Desktop stats block: primary grid + coords row + optional squawk row. */
export function DesktopStats(props: Props) {
  return (
    <>
      <PrimaryGrid {...props} />
      <CoordsRow language={props.language} aircraft={props.aircraft} />
      <SquawkRow language={props.language} squawk={props.aircraft.squawk ?? undefined} />
    </>
  );
}
