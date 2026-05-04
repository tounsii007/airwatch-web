'use client';

import { Clock } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import type { ReplayInfo } from '@/lib/flights/replay';

interface Props {
  replays: ReplayInfo[];
  selected: ReplayInfo | null;
  onSelect: (r: ReplayInfo) => void;
}

function EmptyText() {
  return (
    <p className="text-xs text-[var(--text-muted)]">
      Noch keine Replays — der Backend-Poller zeichnet Positionsdaten alle paar Minuten auf.
    </p>
  );
}

function ListItem({ info, active, onClick }: { info: ReplayInfo; active: boolean; onClick: () => void }) {
  const cls = active
    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
    : 'border-transparent hover:bg-white/5';
  return (
    <li>
      <button onClick={onClick} className={`w-full text-left px-2 py-1.5 border-l-2 transition-colors ${cls}`}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-[var(--font-heading)] text-[var(--text)]">{info.callsign || info.icao24}</span>
          <span className="text-[10px] text-[var(--text-muted)]">{info.positions} pts</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
          <Clock size={10} /> {info.durationMinutes} min
        </div>
      </button>
    </li>
  );
}

/** Sidebar list of replayable flights for the 3D view. */
export function ReplayList({ replays, selected, onSelect }: Props) {
  return (
    <GlassPanel className="p-4 max-h-[580px] overflow-y-auto">
      <h2 className="text-xs font-[var(--font-heading)] font-bold tracking-wider text-[var(--primary)] mb-3">
        AUFZEICHNUNGEN
      </h2>
      {replays.length === 0 ? (
        <EmptyText />
      ) : (
        <ul className="space-y-1">
          {replays.map((r) => (
            <ListItem key={r.icao24} info={r} active={selected?.icao24 === r.icao24} onClick={() => onSelect(r)} />
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
