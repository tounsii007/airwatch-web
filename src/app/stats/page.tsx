'use client';

import { useState } from 'react';
import { NeonText } from '@/components/ui/NeonText';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { useStatsStore } from '@/lib/stores/statsStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { t } from '@/lib/i18n/translations';
import { resolveAirline } from '@/lib/data/airlines';
import { BarChart2, Plane, Building2, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { LogoImage } from '@/components/common/LogoImage';
import { getAirlineLogoUrl } from '@/lib/data/airlines';

export default function StatsPage() {
  const { viewedFlights, totalViews, clearStats } = useStatsStore();
  const { language } = useSettingsStore();
  const [confirmClear, setConfirmClear] = useState(false);

  const uniqueAirlines = useMemo(() => {
    const set = new Set<string>();
    viewedFlights.forEach((f) => { if (f.airlineIcao) set.add(f.airlineIcao); });
    return set.size;
  }, [viewedFlights]);

  const uniqueAirports = useMemo(() => {
    const set = new Set<string>();
    viewedFlights.forEach((f) => {
      if (f.depIata) set.add(f.depIata);
      if (f.arrIata) set.add(f.arrIata);
    });
    return set.size;
  }, [viewedFlights]);

  const topAirlines = useMemo(() => {
    const counts = new Map<string, number>();
    viewedFlights.forEach((f) => {
      if (f.airlineIcao) counts.set(f.airlineIcao, (counts.get(f.airlineIcao) ?? 0) + f.viewCount);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [viewedFlights]);

  const recentFlights = useMemo(() => {
    return [...viewedFlights]
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .slice(0, 20);
  }, [viewedFlights]);

  const handleClear = () => {
    if (confirmClear) {
      clearStats();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
    }
  };

  const isEmpty = viewedFlights.length === 0;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center py-3">
        <NeonText text={t('stats', language)} size="text-xl" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <GlassPanel className="p-3 text-center">
          <Plane size={16} className="mx-auto mb-1 text-[var(--primary)]" />
          <div className="text-lg font-[var(--font-heading)] font-bold text-[var(--primary)]">
            {totalViews}
          </div>
          <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('total_viewed', language)}
          </div>
        </GlassPanel>

        <GlassPanel className="p-3 text-center">
          <BarChart2 size={16} className="mx-auto mb-1 text-[var(--accent)]" />
          <div className="text-lg font-[var(--font-heading)] font-bold text-[var(--accent)]">
            {uniqueAirlines}
          </div>
          <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('unique_airlines', language)}
          </div>
        </GlassPanel>

        <GlassPanel className="p-3 text-center">
          <Building2 size={16} className="mx-auto mb-1 text-[var(--success)]" />
          <div className="text-lg font-[var(--font-heading)] font-bold text-[var(--success)]">
            {uniqueAirports}
          </div>
          <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">
            {t('unique_airports', language)}
          </div>
        </GlassPanel>
      </div>

      {isEmpty ? (
        <GlassPanel className="p-8 text-center space-y-3">
          <BarChart2 size={32} className="mx-auto text-[var(--text-muted)]" />
          <p className="text-[var(--text-muted)] text-sm font-[var(--font-body)]">
            {t('no_stats_yet', language)}
          </p>
          <p className="text-[var(--text-muted)] text-xs font-[var(--font-body)] opacity-70">
            {t('no_stats_hint', language)}
          </p>
        </GlassPanel>
      ) : (
        <>
          {/* Top Airlines */}
          {topAirlines.length > 0 && (
            <div>
              <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
                {t('top_airlines', language)}
              </h3>
              <div className="space-y-1.5">
                {topAirlines.map(([icao, count]) => {
                  // Try to find iata via resolveAirline with the icao as callsign prefix
                  const resolved = resolveAirline(icao);
                  const iata = resolved?.iata ?? '';
                  const name = resolved?.name ?? icao;

                  return (
                    <GlassPanel key={icao} className="px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {iata && (
                          <LogoImage
                            src={getAirlineLogoUrl(iata)}
                            alt={name}
                            width={40}
                            height={16}
                            className="h-4 w-auto object-contain opacity-80"
                          />
                        )}
                        <span className="text-sm font-[var(--font-body)] text-[var(--text-primary)]">
                          {name}
                        </span>
                      </div>
                      <span className="text-xs font-[var(--font-heading)] font-bold text-[var(--primary)]">
                        {count} {t('times_viewed', language)}
                      </span>
                    </GlassPanel>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Flights */}
          <div>
            <h3 className="text-xs font-[var(--font-heading)] text-[var(--text-muted)] tracking-widest mb-2">
              {t('recent_flights', language)}
            </h3>
            <div className="space-y-1.5">
              {recentFlights.map((entry) => {
                const route =
                  entry.depIata && entry.arrIata
                    ? `${entry.depIata} → ${entry.arrIata}`
                    : entry.airlineIcao ?? entry.icao24;
                const date = new Date(entry.lastSeenAt).toLocaleDateString();

                return (
                  <GlassPanel key={entry.icao24} className="px-3 py-2 flex items-center justify-between">
                    <div>
                      <div className="font-[var(--font-heading)] text-sm font-bold text-[var(--text-primary)]">
                        {entry.callsign ?? entry.icao24}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-[var(--font-body)]">
                        {route}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-[var(--font-heading)] font-bold text-[var(--primary)]">
                        ×{entry.viewCount}
                      </div>
                      <div className="text-[9px] text-[var(--text-muted)] font-[var(--font-body)]">
                        {date}
                      </div>
                    </div>
                  </GlassPanel>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Clear History */}
      {!isEmpty && (
        <div className="pt-2 pb-8 text-center space-y-2">
          {confirmClear && (
            <p className="text-xs text-[var(--error)] font-[var(--font-body)]">
              {t('clear_data_confirm', language)}
            </p>
          )}
          <button
            onClick={handleClear}
            className={`flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-xs font-[var(--font-heading)] font-bold tracking-wider transition-colors cursor-pointer ${
              confirmClear
                ? 'bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30'
                : 'text-[var(--text-muted)] hover:text-[var(--error)] border border-[var(--glass-border)]'
            }`}
          >
            <Trash2 size={13} />
            {t('clear_data', language)}
          </button>
        </div>
      )}
    </div>
  );
}
