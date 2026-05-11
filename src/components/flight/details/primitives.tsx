import { StatusBadge } from '@/components/ui/StatusBadge';
import { TickingValue } from '@/components/flight/details/TickingValue';
import type { FlightRouteInfo } from '@/lib/types';

export function TimesRow({ routeInfo, flightStatus }: { routeInfo: FlightRouteInfo; flightStatus?: string }) {
  return (
    <div className="px-4 py-3 border-b border-[var(--glass-border)]">
      <div className="flex items-center justify-between text-xs font-[var(--font-body)]">
        <div>
          <span className="text-[var(--text-muted)] text-[9px] font-[var(--font-heading)] tracking-wider block">DEP</span>
          <span className="text-[var(--text-primary)]">{routeInfo.scheduledDep?.slice(11, 16) ?? '--:--'}</span>
          {(routeInfo.depDelayed ?? 0) > 0 && <span className="ml-1 text-[var(--error)] text-[10px] font-bold">+{routeInfo.depDelayed}min</span>}
        </div>
        <StatusBadge status={routeInfo.status ?? flightStatus} />
        <div className="text-right">
          <span className="text-[var(--text-muted)] text-[9px] font-[var(--font-heading)] tracking-wider block">ARR</span>
          <span className="text-[var(--text-primary)]">{routeInfo.scheduledArr?.slice(11, 16) ?? '--:--'}</span>
          {(routeInfo.arrDelayed ?? 0) > 0 && <span className="ml-1 text-[var(--error)] text-[10px] font-bold">+{routeInfo.arrDelayed}min</span>}
        </div>
      </div>
      {(routeInfo.depTerminal || routeInfo.arrTerminal) && (
        <div className="flex justify-between mt-2 pt-2 border-t border-[var(--glass-border)] text-[10px] text-[var(--text-muted)]">
          <span>{routeInfo.depTerminal ? `T${routeInfo.depTerminal}${routeInfo.depGate ? ` / Gate ${routeInfo.depGate}` : ''}` : ''}</span>
          <span>{routeInfo.arrTerminal ? `T${routeInfo.arrTerminal}${routeInfo.arrBaggage ? ` / Bag ${routeInfo.arrBaggage}` : ''}` : ''}</span>
        </div>
      )}
    </div>
  );
}

export function FlagAirport({
  iata,
  city,
  country,
  color,
  compact,
}: {
  city?: string;
  color: string;
  compact?: boolean;
  country?: string;
  iata?: string;
}) {
  return (
    <div className="text-center min-w-0" style={{ flex: compact ? '0 0 auto' : '1' }}>
      <span className={`font-[var(--font-heading)] font-bold tracking-wider ${compact ? 'text-sm' : 'text-lg'}`} style={{ color }}>
        {iata ?? '---'}
      </span>
      {city && <p className={`text-[var(--text-secondary)] font-[var(--font-body)] truncate ${compact ? 'text-[8px]' : 'text-[10px]'}`}>{city}</p>}
      {country && <p className={`text-[var(--text-muted)] font-[var(--font-body)] truncate ${compact ? 'text-[7px]' : 'text-[9px]'}`}>{country}</p>}
    </div>
  );
}

export function DataCell({ icon, label, value, color }: { color?: string; icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-panel p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[var(--text-muted)]">{icon}</span>
        <span className="text-[var(--text-muted)] text-[9px] font-[var(--font-heading)] tracking-wider">{label}</span>
      </div>
      {/* TickingValue keeps the DOM identity stable when the WS push
          re-emits the same number (no flash), and briefly highlights
          the value on a real change so the user can spot which stat
          actually moved between two updates. */}
      <p className="font-[var(--font-heading)] font-bold text-sm tracking-wide" style={color ? { color } : undefined}>
        <TickingValue value={value} />
      </p>
    </div>
  );
}

export function MiniCell({ label, value, color, highlight }: { color?: string; highlight?: boolean; label: string; value: string }) {
  return (
    <div className={`glass-panel px-2 py-1.5 text-center ${highlight ? 'border-[var(--error)]/30' : ''}`}>
      <span className="text-[7px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider block">{label}</span>
      <span className={`text-[11px] font-[var(--font-heading)] font-bold ${highlight ? 'text-[var(--error)]' : ''}`} style={color ? { color } : undefined}>
        <TickingValue value={value} />
      </span>
    </div>
  );
}

export function Tag({ label, value, highlight }: { highlight?: boolean; label: string; value: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-[var(--font-heading)] px-2 py-1 rounded ${highlight ? 'bg-[var(--error)]/15 text-[var(--error)] border border-[var(--error)]/30' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
      {label && <span className="text-[var(--text-muted)]">{label}</span>} {value}
    </span>
  );
}
