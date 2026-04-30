'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Clock, CuboidIcon, History, Plane } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
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
          className="badge badge-info ml-auto hover:bg-[var(--info)]/20 transition-colors cursor-pointer"
        >
          <CuboidIcon size={12} />
          3D-ANSICHT
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* List of replayable flights */}
        <GlassPanel className="p-4 max-h-[540px] overflow-y-auto">
          <h2 className="text-xs font-[var(--font-heading)] font-bold tracking-wider text-[var(--primary)] mb-3">
            RECENT FLIGHTS
          </h2>
          {replays.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">
              No replay data yet. Wait a few minutes — the backend records airborne positions every poll.
            </p>
          ) : (
            <ul className="space-y-1">
              {replays.map((r) => (
                <li key={r.icao24}>
                  <button
                    onClick={() => load(r)}
                    className={`w-full text-left px-2 py-1.5 border-l-2 transition-colors ${
                      selected?.icao24 === r.icao24
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                        : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-[var(--font-heading)] text-[var(--text)]">
                        {r.callsign || r.icao24}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {r.positions} pts
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                      <Clock size={10} /> {r.durationMinutes} min
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        {/* Replay viewport */}
        <GlassPanel className="p-4">
          {selected ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Plane size={14} className="text-[var(--accent)]" />
                <span className="text-sm font-[var(--font-heading)] tracking-wider">
                  {selected.callsign || selected.icao24}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-auto">
                  {positions.length} positions
                </span>
              </div>
              {loading ? (
                <p className="text-xs text-[var(--text-muted)] py-20 text-center">Loading track…</p>
              ) : (
                <FlightReplayMap positions={positions} />
              )}
            </>
          ) : (
            <div className="py-20 text-center text-xs text-[var(--text-muted)]">
              Pick a flight from the list to start a replay.
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
