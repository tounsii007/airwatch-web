'use client';

import { Clock, History } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tag } from '@/components/ui/Tag';
import type { ReplayInfo } from '@/lib/flights/replay';

interface Props {
  replays: ReplayInfo[];
  selected: ReplayInfo | null;
  onSelect: (r: ReplayInfo) => void;
}

function ListItem({ info, active, onClick }: { info: ReplayInfo; active: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-left px-2.5 py-2 border-l-2 transition-colors rounded-r ${
          active
            ? 'border-[var(--primary)] bg-[var(--primary)]/10'
            : 'border-transparent hover:bg-white/5 hover:border-[var(--primary)]/30'
        }`}
        aria-current={active}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-[var(--font-heading)] text-xs font-bold text-[var(--text-primary)] truncate">
            {info.callsign || info.icao24}
          </span>
          <Tag variant="info" size="sm">{info.positions} pts</Tag>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-0.5">
          <Clock size={10} /> {info.durationMinutes} min
        </div>
      </button>
    </li>
  );
}

/** Sidebar list of replayable flights for the 3D view. */
export function ReplayList({ replays, selected, onSelect }: Props) {
  return (
    <Card
      title="Aufzeichnungen"
      badge={replays.length > 0 ? <Tag variant="info" size="sm">{replays.length}</Tag> : undefined}
      bare
      bodyClassName="px-3 pb-4 pt-2 max-h-[580px] overflow-y-auto"
    >
      {replays.length === 0 ? (
        <EmptyState
          icon={<History size={22} />}
          title="Noch keine Replays"
          body="Der Backend-Poller zeichnet Positionsdaten alle paar Minuten auf."
          variant="default"
          bare
          className="py-6"
        />
      ) : (
        <ul className="space-y-0.5">
          {replays.map((r) => (
            <ListItem
              key={r.icao24}
              info={r}
              active={selected?.icao24 === r.icao24}
              onClick={() => onSelect(r)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
