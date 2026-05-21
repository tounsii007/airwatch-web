'use client';

import Link from 'next/link';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { LogoImage } from '@/components/common/LogoImage';
import { getAirlineLogoUrl, resolveAirline } from '@/lib/data/airlines';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import { formatNumber } from '@/app/(public)/stats/format';

interface Props {
  entries: [string, number][];
  language: AppLanguage;
}

function AirlineRow({ icao, count, language, max }: { icao: string; count: number; language: AppLanguage; max: number }) {
  const resolved = resolveAirline(icao);
  const name = resolved?.name ?? icao;
  const iata = resolved?.iata ?? '';
  // Width of the share bar — gives the list a visual gradient that
  // makes "who dominates" readable at a glance.
  const sharePct = Math.max(8, Math.round((count / max) * 100));

  return (
    <Link
      href={`/airlines/${icao}`}
      className="block transition-transform hover:translate-x-0.5"
      aria-label={`${name} — ${count} ${t('times_viewed', language)}`}
    >
      <GlassPanel className="relative px-3 py-2 flex items-center justify-between overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 pointer-events-none"
          style={{
            width: `${sharePct}%`,
            background: 'linear-gradient(90deg, color-mix(in srgb, var(--primary) 18%, transparent), transparent)',
          }}
          aria-hidden
        />
        <div className="relative flex items-center gap-2.5">
          {iata ? (
            <LogoImage src={getAirlineLogoUrl(iata)} alt={name} width={40} height={16} className="h-4 w-auto object-contain opacity-80" />
          ) : (
            <span className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider w-10 inline-block">{icao}</span>
          )}
          <span className="text-sm font-[var(--font-body)] text-[var(--text-primary)]">{name}</span>
        </div>
        <span className="relative text-xs font-[var(--font-heading)] font-bold text-[var(--primary)]">
          {formatNumber(count, language)} {t('times_viewed', language)}
        </span>
      </GlassPanel>
    </Link>
  );
}

/** "Top airlines" section on /stats. Renders nothing when empty. */
export function TopAirlinesList({ entries, language }: Props) {
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, c]) => c));
  return (
    <Card
      title={t('top_airlines', language)}
      badge={<Tag variant="info" size="sm">{entries.length}</Tag>}
      bare
      bodyClassName="px-4 pb-4 pt-1 space-y-1.5"
    >
      {entries.map(([icao, count]) => (
        <AirlineRow key={icao} icao={icao} count={count} language={language} max={max} />
      ))}
    </Card>
  );
}
