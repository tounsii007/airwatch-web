'use client';

import { Bell } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { t } from '@/lib/i18n/translations';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import type { GeoFenceAlert } from '@/lib/stores/geofenceStore';

interface Props {
  alerts: GeoFenceAlert[];
  onDismiss: (icao24: string, fenceId: number) => void;
  onClear: () => void;
}

function Header({ count, onClear }: { count: number; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 text-[var(--warning)]">
        <Bell size={14} className="animate-pulse-glow" />
        <span className="text-xs font-[var(--font-heading)] font-bold tracking-wider">
          {count} ALERT{count === 1 ? '' : 'S'}
        </span>
      </div>
      <button onClick={onClear} className="text-[10px] font-[var(--font-heading)] text-[var(--text-muted)] hover:text-[var(--text)] tracking-wider">
        CLEAR ALL
      </button>
    </div>
  );
}

function AlertRow({ alert, onDismiss }: { alert: GeoFenceAlert; onDismiss: (icao24: string, fenceId: number) => void }) {
  const language = useSettingsStore((s) => s.language);
  return (
    <li className="flex items-center justify-between text-xs border-l-2 border-[var(--warning)]/60 pl-2">
      <div className="truncate">
        <span className="font-[var(--font-heading)] text-[var(--warning)] mr-2">{alert.callsign ?? alert.icao24}</span>
        <span className="text-[var(--text-muted)]">→ {alert.fenceName}</span>
      </div>
      <button
        onClick={() => onDismiss(alert.icao24, alert.fenceId)}
        className="text-[var(--text-muted)] hover:text-[var(--text)] ml-2 text-[10px]"
        aria-label={t('dismiss', language)}
      >
        ×
      </button>
    </li>
  );
}

/** List of active geo-fence alerts with per-alert dismiss + clear-all. */
export function AlertsPanel({ alerts, onDismiss, onClear }: Props) {
  if (alerts.length === 0) return null;
  return (
    <GlassPanel className="mb-6 p-4">
      <Header count={alerts.length} onClear={onClear} />
      <ul className="space-y-2 max-h-56 overflow-y-auto">
        {alerts.map((a) => (
          <AlertRow key={`${a.fenceId}-${a.icao24}`} alert={a} onDismiss={onDismiss} />
        ))}
      </ul>
    </GlassPanel>
  );
}
