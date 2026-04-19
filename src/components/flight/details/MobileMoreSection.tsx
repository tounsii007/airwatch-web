'use client';

import { ManagedImage } from '@/components/common/ManagedImage';
import { t } from '@/lib/i18n/translations';
import { MiniCell, Tag, TimesRow } from '@/components/flight/details/primitives';
import { formatCoord, formatVerticalRateFpm, isEmergencySquawk, verticalRateColor } from '@/components/flight/details/flightDisplayUtils';
import type { AircraftMetadata, AircraftState, AppLanguage, FlightRouteInfo } from '@/lib/types';

interface Props {
  language: AppLanguage;
  selectedAircraft: AircraftState;
  metadata: AircraftMetadata | null;
  photoUrl: string | null;
  routeInfo: FlightRouteInfo | null;
  flightStatus: string | undefined;
}

function Thumb({ photoUrl }: { photoUrl: string }) {
  return (
    <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0">
      <ManagedImage src={photoUrl} alt="" fill sizes="80px" unoptimized className="object-cover" />
    </div>
  );
}

function MetadataStack({ metadata, language }: { metadata: AircraftMetadata; language: AppLanguage }) {
  return (
    <>
      <p className="text-xs font-[var(--font-body)] font-bold text-[var(--text-primary)] truncate">
        {metadata.manufacturer} {metadata.model}
      </p>
      {metadata.operatorName && (
        <p className="text-[10px] text-[var(--text-secondary)] truncate">
          {t('operated_by', language)} {metadata.operatorName}
        </p>
      )}
      <div className="flex gap-1 mt-1 flex-wrap">
        {metadata.registration && <Tag label="REG" value={metadata.registration} />}
        {metadata.typecode && <Tag label="" value={metadata.typecode} />}
      </div>
    </>
  );
}

function PhotoAndMeta({ metadata, photoUrl, language }: { metadata: AircraftMetadata | null; photoUrl: string | null; language: AppLanguage }) {
  return (
    <div className="flex gap-2 p-3 border-b border-[var(--glass-border)]">
      {photoUrl && <Thumb photoUrl={photoUrl} />}
      <div className="flex-1 min-w-0">{metadata && <MetadataStack metadata={metadata} language={language} />}</div>
    </div>
  );
}

function DetailGrid({ language, aircraft }: { language: AppLanguage; aircraft: AircraftState }) {
  const { verticalRate, latitude, longitude, squawk } = aircraft;
  return (
    <div className="grid grid-cols-3 gap-1.5 p-3">
      <MiniCell label={t('vs_label', language)} value={formatVerticalRateFpm(verticalRate)} color={verticalRateColor(verticalRate)} />
      <MiniCell label={t('lat_label', language)} value={formatCoord(latitude)} />
      <MiniCell label={t('lon_label', language)} value={formatCoord(longitude)} />
      {squawk && <MiniCell label={t('squawk_label', language)} value={squawk} highlight={isEmergencySquawk(squawk)} />}
    </div>
  );
}

/** Expanded "more stats" section on the mobile panel. Shown when user taps More. */
export function MobileMoreSection({ language, selectedAircraft, metadata, photoUrl, routeInfo, flightStatus }: Props) {
  return (
    <div className="border-t border-[var(--glass-border)]">
      {routeInfo?.scheduledDep && <TimesRow routeInfo={routeInfo} flightStatus={flightStatus} />}
      <PhotoAndMeta metadata={metadata} photoUrl={photoUrl} language={language} />
      <DetailGrid language={language} aircraft={selectedAircraft} />
    </div>
  );
}
