'use client';

import { ArrowRight } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { getAirportCity } from '@/lib/data/airportIndex';
import { t } from '@/lib/i18n/translations';
import type { AppLanguage } from '@/lib/types';
import type { RouteEntry } from '@/app/(public)/stats/statsMetrics';
import { formatNumber } from '@/app/(public)/stats/format';

interface Props {
  routes: RouteEntry[];
  language: AppLanguage;
}

function RouteRow({ route, language }: { route: RouteEntry; language: AppLanguage }) {
  const depCity = getAirportCity(route.dep);
  const arrCity = getAirportCity(route.arr);
  return (
    <GlassPanel className="px-3 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 font-[var(--font-heading)] font-bold text-sm text-[var(--text-primary)]">
            <span>{route.dep}</span>
            <ArrowRight size={12} className="text-[var(--text-muted)] shrink-0" aria-hidden />
            <span>{route.arr}</span>
          </div>
          {(depCity || arrCity) && (
            <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)] truncate">
              {depCity || route.dep} → {arrCity || route.arr}
            </div>
          )}
        </div>
      </div>
      <span className="text-xs font-[var(--font-heading)] font-bold text-[var(--primary)] shrink-0">
        {formatNumber(route.views, language)} {t('times_viewed', language)}
      </span>
    </GlassPanel>
  );
}

export function TopRoutesList({ routes, language }: Props) {
  if (routes.length === 0) return null;
  return (
    <Card
      title={t('top_routes', language)}
      badge={<Tag variant="default" size="sm">{routes.length}</Tag>}
      bare
      bodyClassName="px-4 pb-4 pt-1 space-y-1.5"
    >
      {routes.map((r) => <RouteRow key={r.key} route={r} language={language} />)}
    </Card>
  );
}
