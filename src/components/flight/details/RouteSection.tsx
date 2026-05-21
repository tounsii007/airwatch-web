'use client';

import { Plane } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { FlagImage } from '@/components/common/FlagImage';
import { FlagAirport } from '@/components/flight/details/primitives';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';

interface Props {
  depIata?: string;
  depCity?: string;
  depCountry?: string;
  depCode?: string;
  arrIata?: string;
  arrCity?: string;
  arrCountry?: string;
  arrCode?: string;
  compact: boolean;
  isLoading: boolean;
}

function LoadingRow() {
  const language = useSettingsStore((s) => s.language);
  return (
    <div className="flex items-center justify-center py-3 gap-2">
      <Spinner size={12} variant="primary" />
      <span className="text-[var(--text-muted)] text-[10px]">{t('loading_dots', language)}</span>
    </div>
  );
}

function FlagDot({ code, compact }: { code?: string; compact: boolean }) {
  if (!code) return null;
  return (
    <FlagImage
      code={code}
      width={compact ? 16 : 20}
      height={compact ? 12 : 14}
      className="rounded-sm object-cover shadow-sm shrink-0"
    />
  );
}

function RouteLine({ depCode, arrCode, compact }: { depCode?: string; arrCode?: string; compact: boolean }) {
  return (
    <div className="flex-1 flex items-center gap-1 px-1">
      <FlagDot code={depCode} compact={compact} />
      <div className="flex-1 h-px bg-gradient-to-r from-[var(--success)] to-[var(--primary)]" />
      <Plane size={compact ? 10 : 14} className="text-[var(--primary)] -rotate-90 shrink-0" />
      <div className="flex-1 h-px bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
      <FlagDot code={arrCode} compact={compact} />
    </div>
  );
}

/** Dep → Arr route strip with country flags and flight icon. */
export function RouteSection(props: Props) {
  if (props.isLoading) return <LoadingRow />;
  return (
    <div className="flex items-center gap-2">
      <FlagAirport iata={props.depIata} city={props.depCity} country={props.depCountry} color="var(--success)" compact={props.compact} />
      <RouteLine depCode={props.depCode} arrCode={props.arrCode} compact={props.compact} />
      <FlagAirport iata={props.arrIata} city={props.arrCity} country={props.arrCountry} color="var(--accent)" compact={props.compact} />
    </div>
  );
}
