'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { formatAltitude } from '@/lib/utils';
import { resolveAirline } from '@/lib/data/airlines';
import { t } from '@/lib/i18n/translations';
import type { AltitudeUnit, AppLanguage } from '@/lib/types';
import { TIER_COLORS, TIER_LABELS, type SpottingEntry } from '@/app/(public)/spotting/spottingTypes';

interface Props {
  entry: SpottingEntry;
  altitudeUnit: AltitudeUnit;
  language: AppLanguage;
  onTrack: () => void;
}

function TierBadge({ tier }: { tier: SpottingEntry['rareInfo']['tier'] }) {
  const color = TIER_COLORS[tier];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Star size={12} style={{ color, fill: color }} />
      <span className="text-[7px] font-[var(--font-heading)] tracking-wider" style={{ color }}>{TIER_LABELS[tier]}</span>
    </div>
  );
}

function Info({ entry }: { entry: SpottingEntry }) {
  const { aircraft, rareInfo } = entry;
  const airlineInfo = resolveAirline(aircraft.callsign ?? '');
  return (
    <div>
      <div className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">
        {aircraft.callsign || aircraft.icao24}
      </div>
      <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)]">
        {rareInfo.label}{airlineInfo && ` · ${airlineInfo.name}`}
      </div>
      {aircraft.depIata && aircraft.arrIata && (
        <div className="text-[9px] text-[var(--text-muted)] font-[var(--font-body)]">
          {aircraft.depIata} -&gt; {aircraft.arrIata}
        </div>
      )}
    </div>
  );
}

function AltDistance({ entry, altitudeUnit }: { entry: SpottingEntry; altitudeUnit: AltitudeUnit }) {
  return (
    <div className="text-right">
      <div className="text-xs font-[var(--font-heading)] text-[var(--accent)]">{formatAltitude(entry.aircraft.baroAltitude, altitudeUnit)}</div>
      <div className="text-[10px] text-[var(--text-muted)] font-[var(--font-body)]">{Math.round(entry.distance)} km</div>
    </div>
  );
}

/** One row in the /spotting nearby-rares list. */
export function SpottingCard({ entry, altitudeUnit, language, onTrack }: Props) {
  // Card body links to the flight detail page — typical "tap-anywhere"
  // expectation. The TRACK button shadows-stops propagation and runs
  // its own action (select on map + bounce home).
  const detailHref = `/flight/${entry.aircraft.icao24}`;
  return (
    <GlassPanel className="p-0">
      <Link
        href={detailHref}
        className="p-3 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer rounded-xl"
        aria-label={`${entry.aircraft.callsign ?? entry.aircraft.icao24} details`}
      >
        <div className="flex items-center gap-3">
          <TierBadge tier={entry.rareInfo.tier} />
          <Info entry={entry} />
        </div>
        <div className="flex items-center gap-2.5">
          <AltDistance entry={entry} altitudeUnit={altitudeUnit} />
          <button
            onClick={(e) => {
              // Keep the TRACK action distinct from "open detail page".
              // stopPropagation prevents the wrapping <Link> from also
              // firing when the operator hits TRACK.
              e.preventDefault();
              e.stopPropagation();
              onTrack();
            }}
            className="px-2 py-1 rounded-lg text-[9px] font-[var(--font-heading)] font-bold tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 hover:bg-[var(--primary)]/25 transition-colors cursor-pointer"
          >
            {t('track', language)}
          </button>
        </div>
      </Link>
    </GlassPanel>
  );
}
