'use client';

/**
 * AircraftFlightDetailsCard — consolidated "AIRCRAFT & FLIGHT DETAILS" glass
 * card for the redesigned flight detail panel.
 *
 * This is a pure re-wrap of the content previously split between
 * {@link MetadataSection} (airframe identity + REG/TYPE tags) and
 * {@link DesktopStats} (the live ALT/SPD/HDG/V-S grid + squawk). No new data
 * is fetched or derived here — every value comes from the same `aircraft`
 * state and `viewModel` the legacy sections consumed, formatted with the same
 * shared helpers, and rendered with the same {@link DataCell}/{@link Tag}
 * primitives so the numbers tick identically.
 */

import { ArrowUpDown, Gauge, Navigation, Plane } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { formatAltitude, formatSpeed } from '@/lib/utils';
import { DataCell, Tag } from '@/components/flight/details/primitives';
import { Tag as UiTag } from '@/components/ui/Tag';
import {
  formatHeading,
  formatVerticalRateFpm,
  isEmergencySquawk,
  verticalRateColor,
} from '@/components/flight/details/flightDisplayUtils';
import type { FlightDetailsVM } from '@/components/flight/details/useFlightDetailsViewModel';
import type { AircraftState, AltitudeUnit, AppLanguage, SpeedUnit } from '@/lib/types';

interface Props {
  aircraft: AircraftState;
  viewModel: FlightDetailsVM;
  language: AppLanguage;
  altitudeUnit: AltitudeUnit;
  speedUnit: SpeedUnit;
  altColor?: string;
}

/** Icon + tracking-widest heading label, matching the panel's card titles. */
function CardTitle() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Plane size={14} className="text-[var(--primary)] shrink-0" aria-hidden />
      <span className="text-xs font-[var(--font-heading)] tracking-widest text-[var(--text-muted)]">
        AIRCRAFT &amp; FLIGHT DETAILS
      </span>
    </div>
  );
}

/** Airframe identity line: "Manufacturer Model" + optional typecode chip. */
function AircraftIdentity({ metadata }: { metadata: FlightDetailsVM['metadata'] }) {
  if (!metadata) return null;
  const name = [metadata.manufacturer, metadata.model].filter(Boolean).join(' ');
  if (!name && !metadata.typecode) return null;
  return (
    <div className="flex items-center gap-2 mb-3 min-w-0">
      {name && (
        <span className="text-sm font-[var(--font-body)] font-bold text-[var(--text-primary)] truncate">
          {name}
        </span>
      )}
      {metadata.typecode && (
        <UiTag variant="info" size="sm" className="shrink-0">
          {metadata.typecode}
        </UiTag>
      )}
    </div>
  );
}

/**
 * AircraftFlightDetailsCard — see file header. Consolidates airframe identity,
 * the live numeric readouts, and the identity tags into one glass card.
 */
export function AircraftFlightDetailsCard({
  aircraft,
  viewModel,
  language,
  altitudeUnit,
  speedUnit,
  altColor,
}: Props) {
  const { baroAltitude, velocity, trueTrack, verticalRate, squawk } = aircraft;
  const { metadata, displayCallsign } = viewModel;
  const registration = metadata?.registration;

  return (
    <div className="glass-panel rounded-2xl p-4">
      <CardTitle />
      <AircraftIdentity metadata={metadata} />

      {/* Live numerics — identical cells/colours to the legacy PrimaryGrid so
          values tick the same way on a WS push. */}
      <div className="grid grid-cols-2 gap-2">
        <DataCell
          icon={<ArrowUpDown size={14} />}
          label={t('alt_label', language)}
          value={formatAltitude(baroAltitude, altitudeUnit)}
          color={altColor}
        />
        <DataCell
          icon={<Gauge size={14} />}
          label={t('spd_label', language)}
          value={formatSpeed(velocity, speedUnit)}
          color="var(--primary)"
        />
        <DataCell
          icon={<Navigation size={14} />}
          label={t('hdg_label', language)}
          value={formatHeading(trueTrack)}
        />
        <DataCell
          icon={<ArrowUpDown size={14} />}
          label={t('vs_label', language)}
          value={formatVerticalRateFpm(verticalRate, ' fpm')}
          color={verticalRateColor(verticalRate)}
        />
      </div>

      {/* Identity tags: flight number, registration, type, squawk. Emergency
          squawks inherit the highlight styling from the shared Tag primitive. */}
      <div className="flex gap-2 mt-3 flex-wrap">
        {displayCallsign && <Tag label={t('flight', language)} value={displayCallsign} />}
        {registration && <Tag label="REG" value={registration} />}
        {metadata?.typecode && <Tag label="TYPE" value={metadata.typecode} />}
        {squawk && (
          <Tag label={t('squawk_label', language)} value={squawk} highlight={isEmergencySquawk(squawk)} />
        )}
      </div>
    </div>
  );
}
