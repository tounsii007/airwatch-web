'use client';

import { Star } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { TIER_COLORS, TIER_LABELS, type RareTier, type SpottingEntry } from '@/app/(public)/spotting/spottingTypes';

const TIERS: RareTier[] = [1, 2, 3];

function countByTier(entries: readonly SpottingEntry[], tier: RareTier): number {
  return entries.filter((e) => e.rareInfo.tier === tier).length;
}

// Map the spotting tier number to a StatCard status. Tier 1 (legendary) gets
// warning/amber, tier 2 (rare) gets info/blue, tier 3 (notable) stays default.
const TIER_STATUS: Record<RareTier, 'warning' | 'info' | 'default'> = {
  1: 'warning',
  2: 'info',
  3: 'default',
};

function TierCell({ tier, count }: { tier: RareTier; count: number }) {
  return (
    <StatCard
      label={TIER_LABELS[tier]}
      value={count}
      status={TIER_STATUS[tier]}
      icon={<Star size={14} style={{ color: TIER_COLORS[tier], fill: TIER_COLORS[tier] }} aria-hidden />}
    />
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
