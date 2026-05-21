'use client';

import { AlertTriangle } from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useSquawkAlerts, squawkLabel, squawkColor } from '@/lib/hooks/useSquawkAlerts';
import { t } from '@/lib/i18n/translations';

/**
 * Sticky banner at the top of the map that surfaces aircraft squawking
 * emergency codes (7500 hijack, 7600 radio fail, 7700 mayday, etc.).
 *
 * Each alert chip uses the squawk-specific colour (red for hijack,
 * yellow for radio fail, etc.) — these don't map to our `Tag` variants
 * cleanly, so the chips stay inline-styled while the banner chrome uses
 * the standard `.glass-panel` token.
 */
export function SquawkAlertBanner() {
  const alerts = useSquawkAlerts();
  const selectAircraft = useFlightStore((s) => s.selectAircraft);
  const language = useSettingsStore((s) => s.language);

  if (alerts.length === 0) return null;

  return (
    <div className="absolute top-12 left-0 right-0 z-[999] px-3 pointer-events-none flex justify-center">
      <div className="glass-panel border border-[#F87171]/40 bg-[#F87171]/8 px-3 py-2 flex items-center gap-2 flex-wrap pointer-events-auto max-w-2xl max-h-20 overflow-y-auto rounded-lg shadow-[0_0_24px_-6px_#F87171]">
        <div className="flex items-center gap-1.5 shrink-0">
          <AlertTriangle size={13} className="text-[#F87171] animate-pulse" aria-hidden />
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
                type="button"
                onClick={() => selectAircraft(ac)}
                style={{ borderColor: `${color}60`, color }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-[var(--font-heading)] font-bold tracking-wider hover:opacity-80 transition-opacity cursor-pointer"
                aria-label={`Track ${ac.callsign ?? ac.icao24} squawking ${label}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: color }}
                  aria-hidden
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
