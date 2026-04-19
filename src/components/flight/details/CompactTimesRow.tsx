'use client';

import { ManagedImage } from '@/components/common/ManagedImage';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage, FlightRouteInfo } from '@/lib/types';

interface Props {
  language: AppLanguage;
  routeInfo: FlightRouteInfo | null;
  photoUrl: string | null;
}

function hhmm(iso?: string): string {
  return iso?.slice(11, 16) ?? '--:--';
}

function Time({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[var(--text-muted)]">
      {label} <span className="text-[var(--text-primary)] font-bold">{value}</span>
    </span>
  );
}

function DelayBadge({ minutes }: { minutes?: number }) {
  if (!minutes || minutes <= 0) return null;
  return <span className="text-[var(--error)] text-[9px] font-bold">+{minutes}min</span>;
}

function TimesGroup({ language, routeInfo }: { language: AppLanguage; routeInfo: FlightRouteInfo }) {
  return (
    <div className="flex items-center gap-3 text-[10px] font-[var(--font-body)]">
      <Time label={t('dep', language)} value={hhmm(routeInfo.scheduledDep)} />
      {routeInfo.scheduledArr && <Time label={t('arr', language)} value={hhmm(routeInfo.scheduledArr)} />}
      <DelayBadge minutes={routeInfo.depDelayed} />
    </div>
  );
}

function ThumbPhoto({ url }: { url: string }) {
  return (
    <div className="relative w-16 h-10 rounded overflow-hidden shrink-0">
      <ManagedImage src={url} alt="" fill sizes="64px" unoptimized className="object-cover" />
    </div>
  );
}

/** Compact scheduled-dep/arr row with optional aircraft thumbnail, mobile-only. */
export function CompactTimesRow({ language, routeInfo, photoUrl }: Props) {
  const hasTimes = !!routeInfo?.scheduledDep;
  if (!hasTimes && !photoUrl) return null;
  return (
    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--glass-border)]">
      {routeInfo?.scheduledDep ? <TimesGroup language={language} routeInfo={routeInfo} /> : <div />}
      {photoUrl && <ThumbPhoto url={photoUrl} />}
    </div>
  );
}
