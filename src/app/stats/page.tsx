'use client';

import { useMemo } from 'react';
import { NeonText } from '@/components/ui/NeonText';
import { useStatsStore } from '@/lib/stores/statsStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { ClearHistoryButton } from '@/app/stats/ClearHistoryButton';
import { EmptyState } from '@/app/stats/EmptyState';
import { RecentFlightsList } from '@/app/stats/RecentFlightsList';
import { SummaryRow } from '@/app/stats/SummaryRow';
import { TopAirlinesList } from '@/app/stats/TopAirlinesList';
import { countUniqueAirlines, countUniqueAirports, recentFlights, topAirlines } from '@/app/stats/statsMetrics';

export default function StatsPage() {
  const { viewedFlights, totalViews, clearStats } = useStatsStore();
  const { language } = useSettingsStore();

  const uniqueAirlines = useMemo(() => countUniqueAirlines(viewedFlights), [viewedFlights]);
  const uniqueAirports = useMemo(() => countUniqueAirports(viewedFlights), [viewedFlights]);
  const top = useMemo(() => topAirlines(viewedFlights), [viewedFlights]);
  const recent = useMemo(() => recentFlights(viewedFlights), [viewedFlights]);

  const isEmpty = viewedFlights.length === 0;

  return (
    <div className="p-4 space-y-4">
      <div className="text-center py-3">
        <NeonText text={t('stats', language)} size="text-xl" />
      </div>
      <SummaryRow
        totalViews={totalViews}
        uniqueAirlines={uniqueAirlines}
        uniqueAirports={uniqueAirports}
        language={language}
      />
      {isEmpty ? (
        <EmptyState language={language} />
      ) : (
        <>
          <TopAirlinesList entries={top} language={language} />
          <RecentFlightsList flights={recent} language={language} />
          <ClearHistoryButton onClear={clearStats} language={language} />
        </>
      )}
    </div>
  );
}
