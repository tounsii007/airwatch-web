'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Clock, CuboidIcon, History, Plane } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingRadar } from '@/components/ui/LoadingRadar';
import { Tag } from '@/components/ui/Tag';
import { useMounted } from '@/lib/hooks/useMounted';
import {
  fetchAvailableReplays,
  fetchHistory,
  type FlightPosition,
  type ReplayInfo,
} from '@/lib/flights/replay';

const FlightReplayMap = dynamic(
  () => import('@/components/replay/FlightReplayMap').then((m) => m.FlightReplayMap),
  { ssr: false },
);

function ReplayListItem({ info, active, onClick }: { info: ReplayInfo; active: boolean; onClick: () => void }) {
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

export default function ReplayPage() {
  const mounted = useMounted();
  const [replays, setReplays] = useState<ReplayInfo[]>([]);
  const [selected, setSelected] = useState<ReplayInfo | null>(null);
  const [positions, setPositions] = useState<FlightPosition[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    void fetchAvailableReplays().then(setReplays);
  }, [mounted]);

  const load = useCallback(async (r: ReplayInfo) => {
    setSelected(r);
    setLoading(true);
    const data = await fetchHistory(r.icao24, 24);
    setPositions(data);
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg)] pb-20 pt-6 px-4 md:px-8 lg:pt-16 animate-fade-up">
      <header className="mb-6 flex items-center gap-3 animate-fade-in">
        <History size={20} className="text-[var(--primary-bright)]" />
        <h1 className="gradient-text font-[var(--font-heading)] text-xl font-bold tracking-wider">
          FLIGHT REPLAY
        </h1>
        <Link
          href="/replay/3d"
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-[var(--font-heading)] tracking-wider bg-[var(--info)]/15 border border-[var(--info)]/30 text-[var(--info)] hover:bg-[var(--info)]/25 transition-colors"
        >
          <CuboidIcon size={12} />
          3D-ANSICHT
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* List of replayable flights */}
        <Card
          title="Recent flights"
          badge={replays.length > 0 ? <Tag variant="info" size="sm">{replays.length}</Tag> : undefined}
          bare
          bodyClassName="px-3 pb-4 pt-2 max-h-[540px] overflow-y-auto"
        >
          {replays.length === 0 ? (
            <EmptyState
              icon={<History size={22} />}
              title="No replays yet"
              body="The backend records airborne positions every poll cycle. Check back in a few minutes."
              variant="default"
              bare
              className="py-6"
            />
          ) : (
            <ul className="space-y-0.5">
              {replays.map((r) => (
                <ReplayListItem
                  key={r.icao24}
                  info={r}
                  active={selected?.icao24 === r.icao24}
                  onClick={() => load(r)}
                />
              ))}
            </ul>
          )}
        </Card>

        {/* Replay viewport */}
        <Card
          title={
            selected ? (
              <span className="flex items-center gap-2">
                <Plane size={14} className="text-[var(--accent)]" />
                <span>{selected.callsign || selected.icao24}</span>
              </span>
            ) : (
              'Viewport'
            )
          }
          badge={selected ? <Tag variant="default" size="sm">{positions.length} positions</Tag> : undefined}
          bare
          bodyClassName="px-4 pb-4 pt-2"
        >
          {!selected ? (
            <EmptyState
              icon={<Plane size={28} />}
              title="Pick a flight"
              body="Select an entry from the list to start a replay."
              variant="info"
              bare
              className="py-16"
            />
          ) : loading ? (
            <div className="py-12">
              <LoadingRadar size={96} label="LOADING" hint="Fetching track" />
            </div>
          ) : (
            <FlightReplayMap positions={positions} />
          )}
        </Card>
      </div>
    </div>
  );
}
