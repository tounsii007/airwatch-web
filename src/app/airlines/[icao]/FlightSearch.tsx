'use client';

import { Search } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

/** Search bar for filtering an airline's flights by icao/iata/dep/arr. */
export function FlightSearch({ value, onChange }: Props) {
  return (
    <GlassPanel className="flex items-center gap-2 px-3 py-2">
      <Search size={16} className="text-[var(--text-muted)] shrink-0" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Flug suchen..."
        className="flex-1 bg-transparent text-sm font-[var(--font-body)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
      />
      {value && (
        <button onClick={() => onChange('')} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xs">&times;</button>
      )}
    </GlassPanel>
  );
}
