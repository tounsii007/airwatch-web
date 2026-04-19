'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { useFlightStore } from '@/lib/stores/flightStore';
import { MOCK_SCENARIOS, type MockScenarioId } from '@/lib/flights/mockAircraft';
import { ScenarioToggle } from '@/components/debug/ScenarioToggle';

/** Keep the mocks fresh so the map renders them as live markers, not offline. */
const REFRESH_INTERVAL_MS = 30_000;

function activeSummary(activeSet: Set<MockScenarioId>): string {
  if (activeSet.size === 0) return 'keine aktiv';
  return `${activeSet.size} aktiv`;
}

/**
 * Floating dev-only control with one toggle per mock scenario
 * (emergencies / ground / phases / military / disrupted / rare).
 */
export function MockEmergenciesPanel() {
  const injectMockAircraft = useFlightStore((s) => s.injectMockAircraft);
  const clearMockByPrefix = useFlightStore((s) => s.clearMockByPrefix);
  const [activeIds, setActiveIds] = useState<Set<MockScenarioId>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Re-inject every active scenario on a timer so the mocks stay "fresh"
  // (lastUpdate ≤ 90s) and the map keeps rendering them.
  useEffect(() => {
    if (refreshRef.current) { clearInterval(refreshRef.current); refreshRef.current = null; }
    if (activeIds.size === 0) return;

    const inject = () => {
      const now = Date.now();
      for (const s of MOCK_SCENARIOS) if (activeIds.has(s.id)) injectMockAircraft(s.build(now));
    };
    inject();
    refreshRef.current = setInterval(inject, REFRESH_INTERVAL_MS);
    return () => {
      if (refreshRef.current) { clearInterval(refreshRef.current); refreshRef.current = null; }
    };
  }, [activeIds, injectMockAircraft]);

  const toggleScenario = (id: MockScenarioId) => {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        const scenario = MOCK_SCENARIOS.find((s) => s.id === id);
        if (scenario) clearMockByPrefix(scenario.prefix);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalActive = activeIds.size;
  const summary = useMemo(() => activeSummary(activeIds), [activeIds]);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="fixed top-20 right-4 lg:top-20 lg:right-20 z-[2000] glass-panel px-2 py-2 flex items-center gap-1.5 hover:bg-white/5 cursor-pointer shadow-lg"
        aria-label="Open dev tools"
      >
        <FlaskConical size={14} className="text-[var(--primary)]" />
        {totalActive > 0 && (
          <span className="text-[9px] font-[var(--font-heading)] font-bold text-[var(--primary)] tabular-nums">
            {totalActive}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed top-20 right-4 lg:top-20 lg:right-20 z-[2000] glass-panel rounded-xl p-3 w-[300px] max-h-[75vh] overflow-y-auto pointer-events-auto shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical size={14} className="text-[var(--primary)]" />
        <span className="text-[10px] font-[var(--font-heading)] font-bold tracking-widest text-[var(--primary)]">
          DEV TOOLS
        </span>
        <span className="text-[9px] font-[var(--font-body)] text-[var(--text-muted)] ml-auto mr-2">
          {summary}
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
          aria-label="Collapse dev tools"
        >
          <X size={12} />
        </button>
      </div>

      <div className="text-[9px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider mb-2">
        MOCK-SZENARIEN
      </div>

      <div className="space-y-1.5">
        {MOCK_SCENARIOS.map((s) => (
          <ScenarioToggle
            key={s.id}
            scenario={s}
            active={activeIds.has(s.id)}
            onToggle={() => toggleScenario(s.id)}
          />
        ))}
      </div>

      <p className="text-[8px] text-[var(--text-muted)] font-[var(--font-body)] mt-3 leading-relaxed border-t border-[var(--glass-border)] pt-2">
        Szenarien laufen unabhängig vom Airlabs-Rate-Limit. Mocks werden alle 30 s erneuert.
      </p>
    </div>
  );
}
