'use client';

import { Plane } from 'lucide-react';
import { t } from '@/lib/i18n/translations';
import { Tag as KvTag } from '@/components/flight/details/primitives';
import { Tag as UiTag } from '@/components/ui/Tag';
import type { AircraftMetadata, AppLanguage } from '@/lib/types';

interface Props {
  metadata: AircraftMetadata;
  icao24: string;
  language: AppLanguage;
}

function Title({ metadata }: { metadata: AircraftMetadata }) {
  return (
    <div className="flex items-center gap-2 mb-2 min-w-0">
      <Plane size={14} className="text-[var(--primary)] shrink-0" aria-hidden />
      <span className="text-sm font-[var(--font-body)] font-bold text-[var(--text-primary)] truncate">
        {metadata.manufacturer} {metadata.model}
      </span>
      {metadata.typecode && (
        <UiTag variant="info" size="sm" className="shrink-0">
          {metadata.typecode}
        </UiTag>
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

function TagRow({ metadata, icao24, language }: { metadata: AircraftMetadata; icao24: string; language: AppLanguage }) {
  // Compose "engines×type" once so the row stays compact when both are known.
  const enginesLabel =
    metadata.engineCount && metadata.engine
      ? `${metadata.engineCount}× ${metadata.engine}`
      : (metadata.engine ?? metadata.engineCount);
  return (
    <div className="flex gap-2 mt-2 flex-wrap">
      {metadata.registration && <KvTag label="REG" value={metadata.registration} />}
      {metadata.typecode && <KvTag label="TYPE" value={metadata.typecode} />}
      <KvTag label="ICAO24" value={icao24.toUpperCase()} />
      {metadata.built && <KvTag label={t('built', language)} value={String(metadata.built)} />}
      {metadata.age != null && <KvTag label={t('age', language)} value={`${metadata.age} ${t('years_short', language)}`} />}
      {enginesLabel && <KvTag label={t('engines', language)} value={enginesLabel} />}
      {metadata.msn && <KvTag label="MSN" value={metadata.msn} />}
    </div>
  );
}

/** Desktop-only aircraft metadata block. */
export function MetadataSection({ metadata, icao24, language }: Props) {
  return (
    <div className="px-4 py-3 border-b border-[var(--glass-border)]">
      <Title metadata={metadata} />
      <Operator operatorName={metadata.operatorName} language={language} />
      <TagRow metadata={metadata} icao24={icao24} language={language} />
    </div>
  );
}
