'use client';

import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useSquawkAlerts, squawkLabel, squawkColor } from '@/lib/hooks/useSquawkAlerts';
import { t } from '@/lib/i18n/translations';
import { AlertTriangle } from 'lucide-react';

export function SquawkAlertBanner() {
  const alerts = useSquawkAlerts();
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const language = useSettingsStore((s) => s.language);

  if (alerts.length === 0) return null;

  return (
    <div className="absolute top-12 left-0 right-0 z-[999] px-3 pointer-events-none flex justify-center">
      <div className="glass-panel border border-[#F87171]/40 bg-[#F87171]/8 px-3 py-2 flex items-center gap-2 flex-wrap pointer-events-auto max-w-2xl max-h-20 overflow-y-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <AlertTriangle size={13} className="text-[#F87171] animate-pulse" />
          <span className="text-[10px] font-[var(--font-heading)] font-bold tracking-widest text-[#F87171]">
            {t('squawk_banner_title', language)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {alerts.map((ac) => {
            const color = squawkColor(ac.squawk!);
            const label = squawkLabel(ac.squawk!);
            return (
              <button
                key={ac.icao24}
                onClick={() => selectAircraft(ac)}
                style={{ borderColor: `${color}60`, color }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-[var(--font-heading)] font-bold tracking-wider hover:opacity-80 transition-opacity cursor-pointer"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[var(--text-secondary)]">{ac.callsign ?? ac.icao24}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
