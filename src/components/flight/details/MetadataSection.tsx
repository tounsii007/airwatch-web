'use client';

import { Plane } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { Tag } from '@/components/flight/details/primitives';
import type { AircraftMetadata, AppLanguage } from '@/lib/types';

interface Props {
  metadata: AircraftMetadata;
  icao24: string;
  language: AppLanguage;
}

function Title({ metadata }: { metadata: AircraftMetadata }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Plane size={14} className="text-[var(--primary)]" />
      <span className="text-sm font-[var(--font-body)] font-bold text-[var(--text-primary)]">
        {metadata.manufacturer} {metadata.model}
      </span>
      {metadata.typecode && (
        <span className="text-[9px] font-[var(--font-heading)] px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
          {metadata.typecode}
        </span>
      )}
    </div>
  );
}

function Operator({ operatorName, language }: { operatorName?: string; language: AppLanguage }) {
  if (!operatorName) return null;
  return (
    <p className="text-[var(--text-secondary)] text-xs">
      {t('operated_by', language)} {operatorName}
    </p>
  );
}

function TagRow({ metadata, icao24 }: { metadata: AircraftMetadata; icao24: string }) {
  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {metadata.registration && <Tag label="REG" value={metadata.registration} />}
      {metadata.typecode && <Tag label="TYPE" value={metadata.typecode} />}
      <Tag label="ICAO24" value={icao24.toUpperCase()} />
    </div>
  );
}

/** Desktop-only aircraft metadata block. */
export function MetadataSection({ metadata, icao24, language }: Props) {
  return (
    <div className="px-4 py-3 border-b border-[var(--glass-border)]">
      <Title metadata={metadata} />
      <Operator operatorName={metadata.operatorName} language={language} />
      <TagRow metadata={metadata} icao24={icao24} />
    </div>
  );
}
