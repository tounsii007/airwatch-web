'use client';

import { Star } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { TIER_COLORS, TIER_LABELS, type RareTier, type SpottingEntry } from '@/app/spotting/spottingTypes';

const TIERS: RareTier[] = [1, 2, 3];

function countByTier(entries: readonly SpottingEntry[], tier: RareTier): number {
  return entries.filter((e) => e.rareInfo.tier === tier).length;
}

function TierCell({ tier, count }: { tier: RareTier; count: number }) {
  const color = TIER_COLORS[tier];
  return (
    <GlassPanel className="p-3 text-center">
      <Star size={14} className="mx-auto mb-1" style={{ color }} />
      <div className="text-lg font-[var(--font-heading)] font-bold" style={{ color }}>{count}</div>
      <div className="text-[8px] font-[var(--font-heading)] text-[var(--text-muted)] tracking-wider">{TIER_LABELS[tier]}</div>
    </GlassPanel>
  );
}

/** 3 tier counters (legendary/rare/notable) at the top of /spotting. */
export function TierStatsRow({ entries }: { entries: readonly SpottingEntry[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TIERS.map((t) => <TierCell key={t} tier={t} count={countByTier(entries, t)} />)}
    </div>
  );
}
